# backend/apps/webhooks/tasks.py
"""
Celery tasks for outgoing webhook delivery (M003/S04).

deliver_webhook_event: fired from signal handlers, sends HTTP POST to endpoint URL.
fire_webhook_event: convenience wrapper that finds all matching endpoints and enqueues tasks.

M011/S01: Added retry logic with exponential backoff (3 retries, 60/120/240s delays).
After exhaustion a structured ERROR is logged (and Sentry alert if configured).
"""

import json
import logging
import time
from typing import Optional

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Delivery timeout (seconds)
DELIVERY_TIMEOUT = 10
# Max response body captured in log
MAX_RESPONSE_BODY = 1000
# Retry config: 3 retries, base delay 60s, exponential backoff (60, 120, 240)
MAX_RETRIES = 3
RETRY_BASE_DELAY = 60  # seconds


@shared_task(
    bind=True,
    max_retries=MAX_RETRIES,
    ignore_result=True,
    queue="maintenance",
    name="apps.webhooks.tasks.deliver_webhook_event",
)
def deliver_webhook_event(self, endpoint_id: int, event: str, payload: dict):
    """
    Deliver a single webhook event to one endpoint.

    Creates a WebhookDeliveryLog entry regardless of success/failure.
    Retries up to MAX_RETRIES times with exponential backoff (60s, 120s, 240s).
    After all retries are exhausted, logs a structured ERROR (dead-letter alert)
    and sends a Sentry alert if SENTRY_DSN is configured.

    Args:
        endpoint_id: WebhookEndpoint.id
        event: Event type string (e.g. "job.completed")
        payload: Payload dict to serialize and send
    """
    import httpx
    from apps.webhooks.models import WebhookEndpoint, WebhookDeliveryLog

    try:
        endpoint = WebhookEndpoint.objects.select_related("company").get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        logger.warning("deliver_webhook_event: endpoint %s not found", endpoint_id)
        return

    # Enterprise gate check at delivery time
    if not endpoint.is_enterprise:
        logger.info(
            "Skipping webhook delivery — company %s is not on enterprise tier",
            endpoint.company_id,
        )
        return

    if not endpoint.is_active:
        return

    payload_bytes = json.dumps(payload, default=str).encode("utf-8")
    signature = endpoint.sign_payload(payload_bytes)

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
        "X-Webhook-Endpoint-Id": str(endpoint_id),
        "User-Agent": "MaintainProof-Webhook/1.0",
        "X-Webhook-Attempt": str(self.request.retries + 1),
    }

    http_status = None
    response_body = ""
    error_message = ""
    status = WebhookDeliveryLog.STATUS_PENDING
    duration_ms = None
    should_retry = False

    start = time.monotonic()
    try:
        with httpx.Client(timeout=DELIVERY_TIMEOUT) as client:
            resp = client.post(endpoint.url, content=payload_bytes, headers=headers)
        duration_ms = int((time.monotonic() - start) * 1000)
        http_status = resp.status_code
        response_body = resp.text[:MAX_RESPONSE_BODY]
        if resp.is_success:
            status = WebhookDeliveryLog.STATUS_SUCCESS
            logger.info(
                "Webhook delivered: event=%s endpoint=%s http=%s duration=%sms attempt=%s",
                event, endpoint_id, http_status, duration_ms, self.request.retries + 1,
            )
        else:
            status = WebhookDeliveryLog.STATUS_FAILED
            should_retry = True
            logger.warning(
                "Webhook non-2xx: event=%s endpoint=%s http=%s attempt=%s",
                event, endpoint_id, http_status, self.request.retries + 1,
            )
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        error_message = str(exc)
        status = WebhookDeliveryLog.STATUS_FAILED
        should_retry = True
        logger.warning(
            "Webhook delivery error: event=%s endpoint=%s error=%s attempt=%s",
            event, endpoint_id, error_message, self.request.retries + 1,
        )

    WebhookDeliveryLog.objects.create(
        endpoint=endpoint,
        event=event,
        payload=payload,
        status=status,
        http_status=http_status,
        response_body=response_body,
        error_message=error_message,
        duration_ms=duration_ms,
    )

    # Retry on failure with exponential backoff
    if should_retry:
        retries_done = self.request.retries
        if retries_done < MAX_RETRIES:
            delay = RETRY_BASE_DELAY * (2 ** retries_done)  # 60, 120, 240
            logger.info(
                "Scheduling webhook retry %s/%s in %ss: event=%s endpoint=%s",
                retries_done + 1, MAX_RETRIES, delay, event, endpoint_id,
            )
            raise self.retry(countdown=delay, exc=Exception(error_message or f"HTTP {http_status}"))
        else:
            # Dead-letter: all retries exhausted
            _dead_letter_alert(endpoint_id, event, payload, error_message or f"HTTP {http_status}")

def _dead_letter_alert(endpoint_id: int, event: str, payload: dict, reason: str) -> None:
    """
    Called when all retries for a webhook delivery are exhausted.

    Logs a structured ERROR for monitoring/alerting.
    Also sends a Sentry alert if SENTRY_DSN is configured.
    """
    logger.error(
        "WEBHOOK_DEAD_LETTER: all %s retries exhausted. "
        "event=%s endpoint=%s reason=%s payload_keys=%s",
        MAX_RETRIES,
        event,
        endpoint_id,
        reason,
        list(payload.keys()) if isinstance(payload, dict) else "?",
        extra={
            "webhook_endpoint_id": endpoint_id,
            "webhook_event": event,
            "webhook_reason": reason,
            "retries": MAX_RETRIES,
        },
    )

    # Optional Sentry alert
    try:
        import sentry_sdk
        with sentry_sdk.new_scope() as scope:
            scope.set_tag("webhook.event", event)
            scope.set_tag("webhook.endpoint_id", str(endpoint_id))
            scope.set_extra("reason", reason)
            scope.set_extra("retries_exhausted", MAX_RETRIES)
            sentry_sdk.capture_message(
                f"Webhook dead-letter: {event} endpoint={endpoint_id} after {MAX_RETRIES} retries",
                level="error",
            )
    except Exception:
        pass  # Sentry unavailable — structured log is the fallback


def fire_webhook_event(event: str, payload: dict, company_id: int) -> int:
    """
    Find all active enterprise endpoints for a company subscribed to the event
    and enqueue a delivery task for each.

    Returns the number of tasks enqueued.
    Non-fatal: exceptions are logged and swallowed so callers are never blocked.
    """
    from apps.webhooks.models import WebhookEndpoint

    try:
        endpoints = WebhookEndpoint.objects.filter(
            company_id=company_id,
            is_active=True,
            company__plan_tier="enterprise",
        )
        count = 0
        for ep in endpoints:
            if ep.subscribes_to(event):
                deliver_webhook_event.delay(ep.id, event, payload)
                count += 1
        if count:
            logger.info("Enqueued %s webhook tasks for event=%s company=%s", count, event, company_id)
        return count
    except Exception as exc:
        logger.error("fire_webhook_event failed: event=%s company=%s error=%s", event, company_id, exc)
        return 0


# =============================================================================
# Payload builders
# =============================================================================

def build_job_completed_payload(job) -> dict:
    return {
        "event": "job.completed",
        "job_id": job.id,
        "company_id": job.company_id,
        "location": getattr(job.location, "name", None) if job.location else None,
        "cleaner_name": job.cleaner.full_name if job.cleaner else None,
        "completed_at": job.actual_end_time.isoformat() if job.actual_end_time else None,
        "status": job.status,
    }


def build_sla_violated_payload(job) -> dict:
    return {
        "event": "sla.violated",
        "job_id": job.id,
        "company_id": job.company_id,
        "location": getattr(job.location, "name", None) if job.location else None,
        "sla_deadline": job.sla_deadline.isoformat() if job.sla_deadline else None,
        "status": job.status,
    }


def build_proof_missing_payload(job) -> dict:
    return {
        "event": "proof.missing",
        "job_id": job.id,
        "company_id": job.company_id,
        "location": getattr(job.location, "name", None) if job.location else None,
        "status": job.status,
    }
