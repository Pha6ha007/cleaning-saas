# backend/apps/webhooks/tasks.py
"""
Celery tasks for outgoing webhook delivery (M003/S04).

deliver_webhook_event: fired from signal handlers, sends HTTP POST to endpoint URL.
fire_webhook_event: convenience wrapper that finds all matching endpoints and enqueues tasks.
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


@shared_task(
    bind=True,
    max_retries=0,
    ignore_result=True,
    queue="maintenance",
    name="apps.webhooks.tasks.deliver_webhook_event",
)
def deliver_webhook_event(self, endpoint_id: int, event: str, payload: dict):
    """
    Deliver a single webhook event to one endpoint.

    Creates a WebhookDeliveryLog entry regardless of success/failure.
    Does not retry — failed deliveries are logged for manual inspection.

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
    }

    http_status = None
    response_body = ""
    error_message = ""
    status = WebhookDeliveryLog.STATUS_PENDING
    duration_ms = None

    start = time.monotonic()
    try:
        with httpx.Client(timeout=DELIVERY_TIMEOUT) as client:
            resp = client.post(endpoint.url, content=payload_bytes, headers=headers)
        duration_ms = int((time.monotonic() - start) * 1000)
        http_status = resp.status_code
        response_body = resp.text[:MAX_RESPONSE_BODY]
        status = WebhookDeliveryLog.STATUS_SUCCESS if resp.is_success else WebhookDeliveryLog.STATUS_FAILED
        logger.info(
            "Webhook delivered: event=%s endpoint=%s status=%s http=%s duration=%sms",
            event, endpoint_id, status, http_status, duration_ms,
        )
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        error_message = str(exc)
        status = WebhookDeliveryLog.STATUS_FAILED
        logger.error(
            "Webhook delivery failed: event=%s endpoint=%s error=%s",
            event, endpoint_id, error_message,
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
