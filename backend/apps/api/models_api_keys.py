# backend/apps/api/models_api_keys.py
"""
M006/S04: Enterprise API Key model

API keys allow Enterprise-tier customers to authenticate programmatic
requests (webhooks, integrations) without using user credentials.

Key security model:
- Raw key is generated once (shown to user once at creation)
- Only SHA-256 hash + 8-char prefix stored in DB
- Verification is timing-safe (hmac.compare_digest)
- Each key has explicit scopes (list of allowed resource types)
"""

import hashlib
import hmac
import secrets
import logging

from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)

# Valid scopes for API keys
SCOPE_WEBHOOKS = "webhooks"
SCOPE_AUDIT_LOG = "audit_log"
SCOPE_ANALYTICS = "analytics"
SCOPE_BRANCHES = "branches"
SCOPE_RECURRING = "recurring"

ALL_SCOPES = [
    SCOPE_WEBHOOKS,
    SCOPE_AUDIT_LOG,
    SCOPE_ANALYTICS,
    SCOPE_BRANCHES,
    SCOPE_RECURRING,
]

KEY_PREFIX = "pp_"  # "proof platform"
KEY_BYTES = 32      # 32 random bytes → 64 hex chars → ~256 bits entropy


class EnterpriseApiKey(models.Model):
    """
    An API key belonging to an Enterprise-tier company.

    Fields:
        company     — owning company (Enterprise gate enforced in view layer)
        name        — human label (e.g. "Zapier Integration")
        key_hash    — SHA-256(raw_key); raw key never stored
        prefix      — first 8 chars of raw key (for display/identification)
        scopes      — list of allowed scope strings
        is_active   — if False, key is rejected
        last_used_at — updated on every authenticated request
        request_count — total requests made with this key
        created_at  — creation timestamp
    """

    company = models.ForeignKey(
        "apps_accounts.Company",
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    name = models.CharField(max_length=100)
    key_hash = models.CharField(max_length=64, unique=True)  # SHA-256 hex
    prefix = models.CharField(max_length=12)  # e.g. "pp_a3f92b1c"
    scopes = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    request_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = "apps_api"
        db_table = "enterprise_api_keys"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.prefix}…) [{self.company.name}]"

    @classmethod
    def generate(cls, company, name: str, scopes: list[str]) -> tuple["EnterpriseApiKey", str]:
        """
        Create a new API key.

        Returns:
            (instance, raw_key) — raw_key is shown once and never stored.
        """
        raw = KEY_PREFIX + secrets.token_hex(KEY_BYTES)
        key_hash = hashlib.sha256(raw.encode()).hexdigest()
        prefix = raw[:12]  # "pp_" + 8 hex chars

        instance = cls.objects.create(
            company=company,
            name=name,
            key_hash=key_hash,
            prefix=prefix,
            scopes=scopes,
        )
        logger.info(
            "EnterpriseApiKey created: id=%d company=%d name=%r prefix=%r",
            instance.id, company.id, name, prefix,
        )
        return instance, raw

    @classmethod
    def verify(cls, raw_key: str) -> "EnterpriseApiKey | None":
        """
        Look up an active key by hash. Returns None if not found or inactive.
        Uses timing-safe comparison.
        """
        if not raw_key or not raw_key.startswith(KEY_PREFIX):
            return None
        candidate_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        # Fetch by hash — still use timing-safe compare to avoid oracle attacks
        try:
            key = cls.objects.select_related("company").get(
                key_hash=candidate_hash, is_active=True
            )
        except cls.DoesNotExist:
            return None

        # hmac.compare_digest for timing safety (even though we already matched by DB lookup)
        if not hmac.compare_digest(key.key_hash, candidate_hash):
            return None

        return key

    def record_usage(self) -> None:
        """Update last_used_at and increment request_count (non-atomic for performance)."""
        EnterpriseApiKey.objects.filter(pk=self.pk).update(
            last_used_at=timezone.now(),
            request_count=models.F("request_count") + 1,
        )
