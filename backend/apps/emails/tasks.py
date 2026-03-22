"""
Celery tasks for the email service.

Tasks:
- send_email_async: Send any transactional email asynchronously
- check_trial_expiry_reminders: Daily task — sends 3-day, 1-day, and expired reminders
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger("apps.emails")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_async(self, template_name: str, to_email: str, context: dict, subject: str):
    """
    Send a transactional email asynchronously via Celery.

    Retries up to 3 times on failure (SMTP errors, timeouts).
    """
    from apps.emails.service import send_transactional_email

    try:
        success = send_transactional_email(
            template_name=template_name,
            to_email=to_email,
            context=context,
            subject=subject,
            fail_silently=False,
        )
        if not success:
            raise RuntimeError(f"send_transactional_email returned False for {to_email}")
    except Exception as exc:
        logger.warning(
            "Email task failed (attempt %d/3): template=%s, to=%s, error=%s",
            self.request.retries + 1, template_name, to_email, exc,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=1, default_retry_delay=300)
def check_trial_expiry_reminders(self):
    """
    Daily task: check all trial companies and send expiry reminders.

    Sends at three milestones:
    - 3 days before expiry
    - 1 day before expiry
    - On the day of expiry (expired)

    Uses a simple check: look at trial_expires_at date vs today.
    Idempotent: only sends if not already sent today (checked via
    a flag on the company or a simple date comparison).

    Returns stats dict for monitoring.
    """
    from apps.accounts.models import Company, User

    now = timezone.now()
    today = now.date()

    stats = {
        "companies_checked": 0,
        "reminders_3day": 0,
        "reminders_1day": 0,
        "reminders_expired": 0,
        "errors": [],
    }

    # Get all trial companies with expiry dates
    trial_companies = Company.objects.filter(
        plan=Company.PLAN_TRIAL,
        trial_expires_at__isnull=False,
    )

    for company in trial_companies:
        stats["companies_checked"] += 1
        expires_date = company.trial_expires_at.date()
        days_left = (expires_date - today).days

        # Determine which reminder to send (if any)
        reminder_type = None
        if days_left == 3:
            reminder_type = "3day"
        elif days_left == 1:
            reminder_type = "1day"
        elif days_left <= 0:
            reminder_type = "expired"
        else:
            continue  # No reminder needed

        # Find the owner to email
        owner = User.objects.filter(
            company=company,
            role__in=[User.ROLE_OWNER, User.ROLE_MANAGER],
            is_active=True,
            email__isnull=False,
        ).exclude(email="").first()

        if not owner:
            continue

        try:
            _send_trial_reminder(company, owner, days_left, reminder_type)
            stats[f"reminders_{reminder_type}"] += 1
        except Exception as exc:
            stats["errors"].append({
                "company_id": company.id,
                "error": str(exc),
            })
            logger.error(
                "Trial reminder failed: company=%s, type=%s, error=%s",
                company.id, reminder_type, exc,
            )

    logger.info(
        "Trial expiry check complete: checked=%d, 3day=%d, 1day=%d, expired=%d, errors=%d",
        stats["companies_checked"],
        stats["reminders_3day"],
        stats["reminders_1day"],
        stats["reminders_expired"],
        len(stats["errors"]),
    )

    return stats


def _send_trial_reminder(company, owner, days_left: int, reminder_type: str):
    """Send a single trial expiry reminder email."""
    from apps.emails.service import send_transactional_email
    from django.conf import settings

    frontend_url = getattr(settings, "FRONTEND_URL", "https://app.proofplatform.com")

    if days_left <= 0:
        expiry_text = "today"
        subject = f"Your {company.name} trial has expired"
    elif days_left == 1:
        expiry_text = "tomorrow"
        subject = f"Your {company.name} trial ends tomorrow"
    else:
        expiry_text = f"in {days_left} days"
        subject = f"Your {company.name} trial ends in {days_left} days"

    context = {
        "user_name": owner.full_name,
        "company_name": company.name,
        "days_left": max(days_left, 0),
        "expiry_text": expiry_text,
        "upgrade_url": f"{frontend_url}/settings/billing",
    }

    send_transactional_email(
        template_name="trial_expiry_reminder",
        to_email=owner.email,
        context=context,
        subject=subject,
        fail_silently=True,
    )


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def send_billing_notification(self, notification_type: str, company_id: int, extra_context: dict = None):
    """
    Send a billing-related email notification.

    Args:
        notification_type: One of "payment_success", "payment_failed", "subscription_canceled"
        company_id: Company ID
        extra_context: Additional template context (plan_tier, next_billing_date, etc.)
    """
    from apps.accounts.models import Company, User
    from apps.emails.service import send_transactional_email
    from django.conf import settings

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        logger.error("send_billing_notification: company %d not found", company_id)
        return

    # Find billing admin (owner first, then any manager)
    owner = User.objects.filter(
        company=company,
        role__in=[User.ROLE_OWNER, User.ROLE_MANAGER],
        is_active=True,
        email__isnull=False,
    ).exclude(email="").first()

    if not owner:
        logger.warning("send_billing_notification: no email contact for company %d", company_id)
        return

    frontend_url = getattr(settings, "FRONTEND_URL", "https://app.proofplatform.com")

    context = {
        "user_name": owner.full_name,
        "company_name": company.name,
        "plan_tier": company.plan_tier,
        "dashboard_url": frontend_url,
        "update_payment_url": f"{frontend_url}/settings/billing",
        "resubscribe_url": f"{frontend_url}/pricing",
        **(extra_context or {}),
    }

    subject_map = {
        "payment_success": f"Payment confirmed — {company.plan_tier.title()} plan",
        "payment_failed": f"Payment failed — action required",
        "subscription_canceled": f"Your subscription has been canceled",
    }

    subject = subject_map.get(notification_type, f"Billing update — {company.name}")

    try:
        send_transactional_email(
            template_name=notification_type,
            to_email=owner.email,
            context=context,
            subject=subject,
            fail_silently=False,
        )
    except Exception as exc:
        logger.warning(
            "Billing notification failed (attempt %d): type=%s, company=%d, error=%s",
            self.request.retries + 1, notification_type, company_id, exc,
        )
        raise self.retry(exc=exc)
