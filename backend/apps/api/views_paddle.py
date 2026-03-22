# backend/apps/api/views_paddle.py
"""
Paddle billing webhook processing and subscription API.

Endpoints:
- POST /api/paddle/webhook/  — unauthenticated, Paddle signature required
- GET  /api/billing/subscription/ — authenticated, returns current subscription state

Architecture:
- PaddleWebhookView verifies signature, deduplicates by event_id, dispatches to handlers
- Handlers update PaddleSubscription and Company.plan based on event type
- Idempotent: duplicate event_id returns 200 immediately
- Ordering-safe: events older than current subscription state are skipped
- Always returns 200 for recognized events to prevent Paddle retry storms
"""

import json
import logging
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.utils import timezone

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.accounts.models import Company, PaddleSubscription, PaddleWebhookEvent

logger = logging.getLogger(__name__)


# =============================================================================
# Signature verification
# =============================================================================


def _verify_paddle_signature(request) -> bool:
    """
    Verify Paddle webhook signature using paddle-python-sdk.

    Fails closed: if no PADDLE_WEBHOOK_SECRET is configured, all requests
    are rejected (returns False). Never allow unsigned webhooks in production.
    """
    secret_key = settings.PADDLE_WEBHOOK_SECRET
    if not secret_key:
        logger.warning("[paddle] PADDLE_WEBHOOK_SECRET not configured — rejecting webhook")
        return False

    try:
        from paddle_billing.Notifications import Secret, Verifier
        result = Verifier().verify(request, Secret(secret_key))
        if not result:
            logger.warning("[paddle] Signature verification returned False")
            return False
        return True
    except Exception as e:
        logger.warning("[paddle] Signature verification failed: %s", e)
        return False


# =============================================================================
# Price ID → Tier mapping
# =============================================================================


def _price_id_to_tier(price_id: str) -> str:
    """Map a Paddle price ID to an internal plan tier. Defaults to 'standard'."""
    if not price_id:
        return Company.TIER_STANDARD

    mapping = {
        settings.PADDLE_PRICE_ID_STANDARD: Company.TIER_STANDARD,
        settings.PADDLE_PRICE_ID_PRO: Company.TIER_PRO,
        settings.PADDLE_PRICE_ID_ENTERPRISE: Company.TIER_ENTERPRISE,
    }
    # Filter out empty-string keys (unconfigured env vars)
    return next(
        (tier for pid, tier in mapping.items() if pid and pid == price_id),
        Company.TIER_STANDARD,
    )


def _parse_occurred_at(occurred_at_str: str) -> datetime:
    """Parse Paddle's ISO 8601 occurred_at string to a timezone-aware datetime."""
    try:
        # Python 3.11+ supports Z suffix natively
        dt = datetime.fromisoformat(occurred_at_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=dt_timezone.utc)
        return dt
    except (ValueError, AttributeError):
        return timezone.now()


# =============================================================================
# Subscription event handlers
# =============================================================================


def _get_subscription_data(event_data: dict) -> dict:
    """Extract relevant fields from Paddle subscription event data."""
    items = event_data.get("items", [])
    price_id = ""
    if items:
        price_id = items[0].get("price", {}).get("id", "")

    billing_period = event_data.get("current_billing_period") or {}
    management_urls = event_data.get("management_urls") or {}

    return {
        "paddle_subscription_id": event_data.get("id", ""),
        "paddle_customer_id": event_data.get("customer_id", ""),
        "status": event_data.get("status", ""),
        "price_id": price_id,
        "period_start": billing_period.get("starts_at"),
        "period_end": billing_period.get("ends_at"),
        "update_url": management_urls.get("update_payment_method", ""),
    }


def _find_company_for_subscription(paddle_subscription_id: str) -> Company | None:
    """
    Find company linked to this subscription.
    Tries PaddleSubscription first; returns None if not found.
    """
    try:
        sub = PaddleSubscription.objects.select_related("company").get(
            paddle_subscription_id=paddle_subscription_id
        )
        return sub.company
    except PaddleSubscription.DoesNotExist:
        return None


def _is_stale_event(sub: PaddleSubscription | None, occurred_at: datetime) -> bool:
    """
    Check if this event is older than the current subscription state.
    Returns True if the event should be skipped (stale/out-of-order).
    """
    if sub is None:
        return False  # No existing sub → always apply
    if sub.updated_at and occurred_at <= sub.updated_at:
        return True
    return False


def _handle_subscription_activated(
    event_data: dict, occurred_at: datetime, webhook_event: PaddleWebhookEvent
) -> str:
    """
    subscription.activated — upgrade company to active plan.
    Also handles subscription.resumed.
    """
    sub_data = _get_subscription_data(event_data)
    paddle_subscription_id = sub_data["paddle_subscription_id"]

    if not paddle_subscription_id:
        logger.error("[paddle] subscription.activated: missing subscription ID")
        return PaddleWebhookEvent.STATUS_FAILED

    # Try to find company via existing subscription record
    company = _find_company_for_subscription(paddle_subscription_id)

    if company is None:
        # New subscription — try custom_data.company_id (set during Paddle.js checkout open)
        custom_data = event_data.get("custom_data") or {}
        company_id = custom_data.get("company_id")
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                logger.info(
                    "[paddle] subscription.activated: linked new sub %s to company %s via custom_data",
                    paddle_subscription_id,
                    company_id,
                )
            except (Company.DoesNotExist, ValueError, TypeError):
                logger.warning(
                    "[paddle] subscription.activated: invalid company_id=%s in custom_data — skipping",
                    company_id,
                )
                return PaddleWebhookEvent.STATUS_SKIPPED
        else:
            logger.warning(
                "[paddle] subscription.activated: no company found for sub %s (no custom_data.company_id) — skipping",
                paddle_subscription_id,
            )
            return PaddleWebhookEvent.STATUS_SKIPPED

    # Check ordering
    sub = getattr(company, "paddle_subscription", None)
    if _is_stale_event(sub, occurred_at):
        logger.info(
            "[paddle] subscription.activated stale for company %s (occurred_at=%s, sub.updated_at=%s)",
            company.id,
            occurred_at,
            sub.updated_at if sub else None,
        )
        return PaddleWebhookEvent.STATUS_SKIPPED

    tier = _price_id_to_tier(sub_data["price_id"])

    # Update or create PaddleSubscription
    period_start = _parse_occurred_at(sub_data["period_start"]) if sub_data["period_start"] else None
    period_end = _parse_occurred_at(sub_data["period_end"]) if sub_data["period_end"] else None

    PaddleSubscription.objects.update_or_create(
        company=company,
        defaults={
            "paddle_subscription_id": paddle_subscription_id,
            "paddle_customer_id": sub_data["paddle_customer_id"],
            "status": PaddleSubscription.STATUS_ACTIVE,
            "plan_tier": tier,
            "current_period_start": period_start,
            "current_period_end": period_end,
            "paddle_update_url": sub_data["update_url"],
        },
    )

    # Upgrade company plan
    company.upgrade_to_active(tier=tier)
    logger.info("[paddle] Company %s upgraded to active (tier=%s)", company.id, tier)

    # Send payment success email (async, non-blocking)
    try:
        from apps.emails.tasks import send_billing_notification
        period_end_str = period_end.strftime("%B %d, %Y") if period_end else None
        send_billing_notification.delay(
            "payment_success",
            company.id,
            {"next_billing_date": period_end_str},
        )
    except Exception as exc:
        logger.warning("[paddle] Failed to queue payment success email for company %s: %s", company.id, exc)

    return PaddleWebhookEvent.STATUS_PROCESSED


def _handle_subscription_canceled(
    event_data: dict, occurred_at: datetime, webhook_event: PaddleWebhookEvent
) -> str:
    """
    subscription.canceled / subscription.past_due / subscription.paused
    — block company (read-only mode).
    """
    sub_data = _get_subscription_data(event_data)
    paddle_subscription_id = sub_data["paddle_subscription_id"]

    if not paddle_subscription_id:
        return PaddleWebhookEvent.STATUS_FAILED

    company = _find_company_for_subscription(paddle_subscription_id)
    if company is None:
        logger.warning(
            "[paddle] subscription cancel: no company found for sub %s — skipping",
            paddle_subscription_id,
        )
        return PaddleWebhookEvent.STATUS_SKIPPED

    sub = getattr(company, "paddle_subscription", None)
    if _is_stale_event(sub, occurred_at):
        return PaddleWebhookEvent.STATUS_SKIPPED

    # Map paddle status to our internal status
    paddle_status = sub_data["status"]
    internal_status_map = {
        "canceled": PaddleSubscription.STATUS_CANCELED,
        "past_due": PaddleSubscription.STATUS_PAST_DUE,
        "paused": PaddleSubscription.STATUS_PAUSED,
    }
    internal_status = internal_status_map.get(paddle_status, PaddleSubscription.STATUS_CANCELED)

    # Update subscription record
    if sub:
        sub.status = internal_status
        sub.save(update_fields=["status", "updated_at"])
    else:
        PaddleSubscription.objects.update_or_create(
            company=company,
            defaults={
                "paddle_subscription_id": paddle_subscription_id,
                "paddle_customer_id": sub_data["paddle_customer_id"],
                "status": internal_status,
            },
        )

    # Block company
    company.plan = Company.PLAN_BLOCKED
    company.save(update_fields=["plan"])
    logger.info(
        "[paddle] Company %s blocked (event=%s, paddle_status=%s)",
        company.id,
        webhook_event.event_type,
        paddle_status,
    )

    # Send billing notification email (async, non-blocking)
    try:
        from apps.emails.tasks import send_billing_notification
        notification_type = "payment_failed" if paddle_status == "past_due" else "subscription_canceled"
        extra_context = {}
        if sub and sub.current_period_end:
            extra_context["access_until"] = sub.current_period_end.strftime("%B %d, %Y")
        send_billing_notification.delay(notification_type, company.id, extra_context)
    except Exception as exc:
        logger.warning("[paddle] Failed to queue billing email for company %s: %s", company.id, exc)

    return PaddleWebhookEvent.STATUS_PROCESSED


def _handle_subscription_updated(
    event_data: dict, occurred_at: datetime, webhook_event: PaddleWebhookEvent
) -> str:
    """
    subscription.updated — update tier and billing period if changed.
    Does not change company.plan (already active).
    """
    sub_data = _get_subscription_data(event_data)
    paddle_subscription_id = sub_data["paddle_subscription_id"]

    if not paddle_subscription_id:
        return PaddleWebhookEvent.STATUS_FAILED

    company = _find_company_for_subscription(paddle_subscription_id)
    if company is None:
        return PaddleWebhookEvent.STATUS_SKIPPED

    sub = getattr(company, "paddle_subscription", None)
    if _is_stale_event(sub, occurred_at):
        return PaddleWebhookEvent.STATUS_SKIPPED

    tier = _price_id_to_tier(sub_data["price_id"])
    period_end = _parse_occurred_at(sub_data["period_end"]) if sub_data["period_end"] else None

    if sub:
        sub.plan_tier = tier
        sub.current_period_end = period_end
        sub.paddle_update_url = sub_data["update_url"] or sub.paddle_update_url
        sub.save(update_fields=["plan_tier", "current_period_end", "paddle_update_url", "updated_at"])
    
    # Update company tier
    if tier != company.plan_tier:
        company.plan_tier = tier
        company.save(update_fields=["plan_tier"])

    return PaddleWebhookEvent.STATUS_PROCESSED


# =============================================================================
# Webhook View
# =============================================================================


@extend_schema(
    tags=["billing"],
    summary="Paddle webhook receiver",
    description=(
        "Receives Paddle webhook events (subscription.activated, subscription.canceled, etc.). "
        "Unauthenticated — Paddle HMAC-SHA256 signature verification is the auth mechanism. "
        "Always returns 200 for recognized events to prevent Paddle retry storms."
    ),
    request=None,
    responses={
        200: OpenApiResponse(description="Event processed or acknowledged"),
        400: OpenApiResponse(description="Invalid signature or malformed payload"),
    },
    auth=[],
)
class PaddleWebhookView(APIView):
    """
    POST /api/paddle/webhook/

    Receives Paddle webhook events. Unauthenticated — Paddle does not send
    auth headers; signature verification is the authentication mechanism.

    Returns 200 for all recognized events (including duplicates and skipped).
    Non-200 responses trigger Paddle retries, which would violate idempotency.
    Returns 403 only for invalid signatures.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    # Handlers mapped by event type prefix
    SUBSCRIPTION_ACTIVATE_EVENTS = {
        "subscription.activated",
        "subscription.resumed",
    }
    SUBSCRIPTION_BLOCK_EVENTS = {
        "subscription.canceled",
        "subscription.past_due",
        "subscription.paused",
    }

    def post(self, request):
        # 1. Verify signature
        if not _verify_paddle_signature(request):
            return Response(
                {"detail": "Invalid signature"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2. Parse body
        try:
            body = request.body
            payload = json.loads(body)
        except (json.JSONDecodeError, Exception) as e:
            logger.error("[paddle] Failed to parse webhook body: %s", e)
            return Response({"detail": "Invalid JSON"}, status=status.HTTP_400_BAD_REQUEST)

        event_id = payload.get("event_id", "")
        event_type = payload.get("event_type", "")
        occurred_at_str = payload.get("occurred_at", "")

        if not event_id or not event_type:
            logger.warning("[paddle] Webhook missing event_id or event_type")
            return Response({"detail": "Missing event_id or event_type"}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Idempotency check — return 200 immediately for duplicates
        if PaddleWebhookEvent.objects.filter(event_id=event_id).exists():
            logger.info("[paddle] Duplicate event %s — skipping", event_id)
            return Response({"detail": "Already processed"}, status=status.HTTP_200_OK)

        # 4. Parse occurred_at
        occurred_at = _parse_occurred_at(occurred_at_str) if occurred_at_str else timezone.now()

        # 5. Persist webhook event record (before processing — audit trail)
        webhook_event = PaddleWebhookEvent.objects.create(
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            occurred_at=occurred_at,
            status=PaddleWebhookEvent.STATUS_PENDING,
        )

        # 6. Dispatch to handler
        event_status = PaddleWebhookEvent.STATUS_SKIPPED
        try:
            event_data = payload.get("data", {})

            if event_type in self.SUBSCRIPTION_ACTIVATE_EVENTS:
                event_status = _handle_subscription_activated(event_data, occurred_at, webhook_event)
            elif event_type in self.SUBSCRIPTION_BLOCK_EVENTS:
                event_status = _handle_subscription_canceled(event_data, occurred_at, webhook_event)
            elif event_type == "subscription.updated":
                event_status = _handle_subscription_updated(event_data, occurred_at, webhook_event)
            elif event_type == "subscription.trialing":
                # Trialing managed internally — acknowledge but don't change plan
                event_status = PaddleWebhookEvent.STATUS_PROCESSED
                logger.info("[paddle] subscription.trialing received — no-op")
            else:
                # Unknown event type — acknowledge but skip
                event_status = PaddleWebhookEvent.STATUS_SKIPPED
                logger.info("[paddle] Unknown event type %s — skipping", event_type)

        except Exception as e:
            logger.exception("[paddle] Handler error for event %s: %s", event_id, e)
            event_status = PaddleWebhookEvent.STATUS_FAILED
            webhook_event.error_message = str(e)

        # 7. Update webhook event status
        webhook_event.status = event_status
        webhook_event.processed_at = timezone.now()
        webhook_event.save(update_fields=["status", "processed_at", "error_message"])

        return Response({"detail": "ok"}, status=status.HTTP_200_OK)


# =============================================================================
# Billing Subscription API
# =============================================================================


@extend_schema(
    tags=["billing"],
    summary="Current subscription status",
    description=(
        "Returns the Paddle subscription state for the authenticated user's company. "
        "Returns `{status: null}` when no subscription exists (trial or new account)."
    ),
    responses={
        200: OpenApiResponse(description="Subscription state: status, plan_tier, next_billed_at, etc."),
        401: OpenApiResponse(description="Not authenticated"),
    },
)
class BillingSubscriptionView(APIView):
    """
    GET /api/billing/subscription/

    Returns current subscription state for the authenticated user's company.
    Used by S04 billing dashboard to show real subscription data.
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = request.user.company
        sub = getattr(company, "paddle_subscription", None)

        base = {
            "plan": company.plan,
            "plan_tier": company.plan_tier,
            "is_trial": company.is_trial,
            "is_trial_active": company.is_trial_active,
            "is_trial_expired": company.is_trial_expired(),
            "trial_expires_at": (
                company.trial_expires_at.isoformat() if company.trial_expires_at else None
            ),
        }

        if sub is None:
            return Response({
                **base,
                "has_subscription": False,
                "status": None,
                "current_period_end": None,
                "paddle_update_url": "",
                "paddle_subscription_id": "",
            })

        return Response({
            **base,
            "has_subscription": True,
            "status": sub.status,
            "current_period_end": (
                sub.current_period_end.isoformat() if sub.current_period_end else None
            ),
            "paddle_update_url": sub.paddle_update_url,
            "paddle_subscription_id": sub.paddle_subscription_id,
        })
