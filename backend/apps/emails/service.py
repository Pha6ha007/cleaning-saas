"""
Proof Platform — Centralized Email Service

All transactional emails go through this module. Provides:
- HTML + plaintext rendering from Django templates
- Consistent branding (header, footer, colours)
- Logging of every email sent (success/failure)
- Celery tasks for async sending and scheduled reminders

Email types:
- Verification (signup)
- Password reset
- Trial expiry reminders (3 days, 1 day, expired)
- Billing: payment success, payment failed, subscription canceled
- Visit assignment / SLA warning (delegated from maintenance.notifications)

Usage:
    from apps.emails.service import send_transactional_email
    send_transactional_email(
        template_name="verification",
        to_email="user@example.com",
        context={"user_name": "Pavel", "verify_url": "https://..."},
        subject="Verify your email",
    )
"""

import logging
from typing import Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger("apps.emails")


def send_transactional_email(
    template_name: str,
    to_email: str,
    context: dict,
    subject: str,
    from_email: Optional[str] = None,
    fail_silently: bool = True,
) -> bool:
    """
    Send a transactional email with HTML + plaintext fallback.

    Args:
        template_name: Name of the template (e.g. "verification").
                       Resolves to emails/{template_name}.html and emails/{template_name}.txt
        to_email: Recipient email address
        context: Template context dict
        subject: Email subject line
        from_email: Sender address (defaults to DEFAULT_FROM_EMAIL)
        fail_silently: If True, log errors but don't raise

    Returns:
        True if sent successfully, False otherwise
    """
    if not to_email:
        logger.warning("send_transactional_email: empty to_email for template=%s", template_name)
        return False

    sender = from_email or settings.DEFAULT_FROM_EMAIL

    # Inject common context
    context.setdefault("platform_name", "Proof Platform")
    context.setdefault("frontend_url", getattr(settings, "FRONTEND_URL", "https://app.proofplatform.com"))
    context.setdefault("support_email", "support@proofplatform.com")
    context.setdefault("current_year", __import__("datetime").date.today().year)

    try:
        html_content = render_to_string(f"emails/{template_name}.html", context)
        text_content = _render_text(template_name, context, html_content)
    except Exception as exc:
        logger.error(
            "Email template render failed: template=%s, to=%s, error=%s",
            template_name, to_email, exc,
        )
        if not fail_silently:
            raise
        return False

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender,
            to=[to_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email sent: template=%s, to=%s", template_name, to_email)
        return True
    except Exception as exc:
        logger.error(
            "Email send failed: template=%s, to=%s, error=%s",
            template_name, to_email, exc,
        )
        if not fail_silently:
            raise
        return False


def _render_text(template_name: str, context: dict, html_fallback: str) -> str:
    """Render plaintext version. Falls back to stripping HTML tags."""
    try:
        return render_to_string(f"emails/{template_name}.txt", context)
    except Exception:
        return strip_tags(html_fallback)
