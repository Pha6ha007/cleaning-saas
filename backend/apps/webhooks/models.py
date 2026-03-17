# backend/apps/webhooks/models.py
"""
Outgoing Webhook Models (M003/S04)

WebhookEndpoint: per-company webhook URL configuration (Enterprise tier only).
WebhookDeliveryLog: immutable delivery audit trail.

Events:
- job.completed: fired when a Job transitions to "completed" status
- sla.violated: fired when SLA deadline is breached
- proof.missing: fired when a completed job is missing required photos

Security:
- Each endpoint has a HMAC-SHA256 secret for payload signing
- Signature is sent as X-Webhook-Signature: sha256=<hex>
- Delivery happens asynchronously via Celery task

Enterprise gate:
- WebhookEndpoint.is_active is only respected when company.plan_tier == "enterprise"
- Endpoints for non-enterprise companies are silently skipped
"""

import hashlib
import hmac
import json
import secrets

from django.db import models
from django.utils import timezone

from apps.accounts.models import Company, User


# =============================================================================
# Event constants
# =============================================================================

EVENT_JOB_COMPLETED = "job.completed"
EVENT_SLA_VIOLATED = "sla.violated"
EVENT_PROOF_MISSING = "proof.missing"

ALL_EVENTS = [EVENT_JOB_COMPLETED, EVENT_SLA_VIOLATED, EVENT_PROOF_MISSING]

EVENT_CHOICES = [
    (EVENT_JOB_COMPLETED, "Job Completed"),
    (EVENT_SLA_VIOLATED, "SLA Violated"),
    (EVENT_PROOF_MISSING, "Proof Missing"),
]


def _generate_secret():
    """Generate a cryptographically random webhook secret."""
    return secrets.token_hex(32)


# =============================================================================
# WebhookEndpoint
# =============================================================================

class WebhookEndpoint(models.Model):
    """
    Per-company outgoing webhook endpoint.

    Enterprise tier only — endpoints for non-enterprise companies are skipped.
    Create/manage via Django Admin.

    The `secret` field is used to sign outgoing payloads with HMAC-SHA256.
    Store it securely on the receiving end to verify request authenticity.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="webhook_endpoints",
    )
    url = models.URLField(
        max_length=500,
        help_text="HTTPS URL that will receive webhook POST requests.",
    )
    secret = models.CharField(
        max_length=128,
        default=_generate_secret,
        help_text="HMAC-SHA256 secret for request signing (auto-generated). "
                  "Never share this publicly.",
    )
    events = models.JSONField(
        default=list,
        help_text="List of event types to subscribe to, e.g. [\"job.completed\", \"sla.violated\"].",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Only active endpoints receive deliveries. "
                  "Requires Enterprise plan tier.",
    )
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_webhook_endpoints",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Webhook Endpoint"
        verbose_name_plural = "Webhook Endpoints"
        indexes = [
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self):
        return f"Webhook [{self.company.name}] → {self.url[:60]}"

    def subscribes_to(self, event: str) -> bool:
        """Return True if this endpoint is subscribed to the given event."""
        return event in (self.events or [])

    def sign_payload(self, payload_bytes: bytes) -> str:
        """
        Compute HMAC-SHA256 signature for payload.

        Returns: "sha256=<hex_digest>"
        Clients should verify: hmac.compare_digest(expected, received)
        """
        sig = hmac.new(
            self.secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()
        return f"sha256={sig}"

    @property
    def is_enterprise(self) -> bool:
        """True if the company has an enterprise plan tier."""
        return getattr(self.company, "plan_tier", None) == "enterprise"


# =============================================================================
# WebhookDeliveryLog
# =============================================================================

class WebhookDeliveryLog(models.Model):
    """
    Immutable audit trail for webhook delivery attempts.

    Created by the Celery delivery task regardless of success/failure.
    """

    STATUS_PENDING = "pending"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    ]

    endpoint = models.ForeignKey(
        WebhookEndpoint,
        on_delete=models.CASCADE,
        related_name="delivery_logs",
    )
    event = models.CharField(max_length=50, choices=EVENT_CHOICES)
    payload = models.JSONField(
        help_text="Serialized payload that was sent (or attempted).",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    http_status = models.IntegerField(
        null=True,
        blank=True,
        help_text="HTTP response status code from the receiving endpoint.",
    )
    response_body = models.TextField(
        blank=True,
        help_text="First 1000 chars of response body for debugging.",
    )
    error_message = models.TextField(
        blank=True,
        help_text="Exception message if delivery failed.",
    )
    duration_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="Request duration in milliseconds.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Webhook Delivery Log"
        verbose_name_plural = "Webhook Delivery Logs"
        indexes = [
            models.Index(fields=["endpoint", "event", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"Delivery {self.event} → {self.endpoint.url[:40]} ({self.status})"
