"""
WhatsApp Business Notification Service (M002: pywa)

Sends WhatsApp messages to technicians and managers for maintenance events:
- visit_assigned: technician receives assignment details
- visit_completed: manager notified of completion
- sla_violated: technician + owner warned of SLA breach

Architecture:
- WhatsAppNotificationService wraps pywa.WhatsApp (send-only mode, no webhook server)
- get_whatsapp_client() returns a cached singleton; returns None when unconfigured
- All sends are logged in WhatsAppNotificationLog for audit trail
- Non-fatal by design: if WhatsApp is unconfigured or fails, email path continues

Production requirements:
- WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set
- Message templates must be pre-approved in Meta Business Manager
- Phone numbers must include country code, no leading '+' or '00' (e.g. '971501234567')

See: docs/deployment/JWT_PADDLE_SUPPLEMENT.md (WhatsApp section TBD)
"""

import logging
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)

# Module-level client singleton — avoids reinitialising httpx on every call
_wa_client = None
_wa_client_initialised = False


def get_whatsapp_client():
    """
    Return a configured pywa.WhatsApp client, or None if not configured.

    Singleton: created once per process, cached at module level.
    Returns None silently when WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN
    are blank — all callers treat None as "WhatsApp disabled, skip gracefully".
    """
    global _wa_client, _wa_client_initialised

    if _wa_client_initialised:
        return _wa_client

    _wa_client_initialised = True
    phone_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")
    token = getattr(settings, "WHATSAPP_ACCESS_TOKEN", "")

    if not phone_id or not token:
        logger.debug("WhatsApp not configured (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN missing)")
        _wa_client = None
        return None

    try:
        from pywa import WhatsApp
        _wa_client = WhatsApp(
            phone_id=phone_id,
            token=token,
        )
        logger.info("WhatsApp client initialised (phone_id=%s)", phone_id[:6] + "***")
    except Exception as exc:
        logger.error("Failed to initialise WhatsApp client: %s", exc)
        _wa_client = None

    return _wa_client


def _normalise_phone(phone: str) -> str:
    """
    Normalise phone number to WhatsApp Business API format.
    Strips leading '+', spaces, and hyphens.
    UAE example: '+971 50 123 4567' → '971501234567'
    """
    if not phone:
        return ""
    cleaned = phone.strip().lstrip("+").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    return cleaned


def send_whatsapp_notification(
    *,
    company,
    kind: str,
    job,
    to_phone: str,
    recipient_user=None,
    triggered_by=None,
) -> bool:
    """
    Send a WhatsApp message for a maintenance event and log it.

    Args:
        company: Company instance (for log scoping)
        kind: Notification kind — one of KIND_* constants from WhatsAppNotificationLog
        job: Job instance
        to_phone: Recipient phone number (will be normalised)
        recipient_user: Optional User instance for the recipient
        triggered_by: Optional User who triggered (None = automated)

    Returns:
        True if sent successfully, False otherwise.
    """
    from apps.maintenance.models import WhatsAppNotificationLog

    client = get_whatsapp_client()
    if client is None:
        # WhatsApp not configured — skip silently, do not log
        return False

    phone = _normalise_phone(to_phone)
    if not phone:
        logger.warning("send_whatsapp_notification: empty phone for job #%s kind=%s", job.id, kind)
        return False

    message_text = _build_message_text(kind, job)
    wa_message_id = ""
    error_message = ""
    success = False

    try:
        response = client.send_message(to=phone, text=message_text)
        # pywa returns a SentMessage with .id attribute
        wa_message_id = str(getattr(response, "id", "")) if response else ""
        success = True
        logger.info(
            "WhatsApp sent: kind=%s job=#%s to=%s wa_id=%s",
            kind, job.id, phone[:6] + "***", wa_message_id,
        )
    except Exception as exc:
        error_message = str(exc)
        logger.error(
            "WhatsApp failed: kind=%s job=#%s to=%s error=%s",
            kind, job.id, phone[:6] + "***", error_message,
        )

    # Always log the attempt
    WhatsAppNotificationLog.objects.create(
        company=company,
        kind=kind,
        status=WhatsAppNotificationLog.STATUS_SENT if success else WhatsAppNotificationLog.STATUS_FAILED,
        job=job,
        to_phone=phone,
        recipient_user=recipient_user,
        wa_message_id=wa_message_id,
        error_message=error_message,
        triggered_by=triggered_by,
    )

    return success


def _build_message_text(kind: str, job) -> str:
    """Build plain-text WhatsApp message for each notification kind."""
    from apps.maintenance.models import WhatsAppNotificationLog

    location_name = job.location.name if job.location else "Unknown Location"
    asset_name = job.asset.name if job.asset else "N/A"
    scheduled_date = job.scheduled_date.strftime("%d %b %Y") if job.scheduled_date else "TBD"
    scheduled_time = job.scheduled_start_time.strftime("%H:%M") if job.scheduled_start_time else "TBD"
    technician_name = job.cleaner.full_name if job.cleaner else "Unassigned"
    sla_deadline = (
        job.sla_deadline.strftime("%d %b %Y %H:%M") if job.sla_deadline else "Not set"
    )

    if kind == WhatsAppNotificationLog.KIND_ASSIGNMENT:
        return (
            f"🔧 *New Assignment — MaintainProof*\n\n"
            f"You have been assigned a service visit:\n"
            f"📍 Location: {location_name}\n"
            f"🖥 Asset: {asset_name}\n"
            f"📅 Date: {scheduled_date} at {scheduled_time}\n"
            f"📝 Notes: {job.manager_notes or 'None'}\n\n"
            f"Visit #{job.id}"
        )

    elif kind == WhatsAppNotificationLog.KIND_COMPLETION:
        actual_end = (
            job.actual_end_time.strftime("%d %b %Y %H:%M")
            if job.actual_end_time else "N/A"
        )
        return (
            f"✅ *Visit Completed — MaintainProof*\n\n"
            f"Service visit has been completed:\n"
            f"📍 Location: {location_name}\n"
            f"👨‍🔧 Technician: {technician_name}\n"
            f"🕐 Completed: {actual_end}\n"
            f"📊 Status: {job.get_status_display() if hasattr(job, 'get_status_display') else job.status}\n\n"
            f"Visit #{job.id}"
        )

    elif kind == WhatsAppNotificationLog.KIND_SLA_WARNING:
        now = None
        try:
            from django.utils import timezone as tz
            now = tz.now()
        except Exception:
            pass
        overdue = now and job.sla_deadline and job.sla_deadline < now
        icon = "🚨" if overdue else "⚠️"
        label = "SLA OVERDUE" if overdue else "SLA Warning"
        return (
            f"{icon} *{label} — MaintainProof*\n\n"
            f"Visit #{job.id} requires attention:\n"
            f"📍 Location: {location_name}\n"
            f"📅 Scheduled: {scheduled_date}\n"
            f"⏰ SLA Deadline: {sla_deadline}\n\n"
            f"Please take action immediately."
        )

    else:
        return (
            f"📋 *Maintenance Notification — MaintainProof*\n\n"
            f"Visit #{job.id}\n"
            f"📍 Location: {location_name}\n"
            f"📅 Date: {scheduled_date}"
        )


# ─── Convenience wrappers (parallel to notifications.py email functions) ─────

def send_whatsapp_assignment(job, triggered_by=None) -> bool:
    """
    Send WhatsApp assignment notification to the technician.
    Called alongside email assignment — non-fatal if WhatsApp unconfigured.
    """
    from apps.maintenance.models import WhatsAppNotificationLog

    if not job.cleaner or not job.cleaner.phone:
        return False

    return send_whatsapp_notification(
        company=job.company,
        kind=WhatsAppNotificationLog.KIND_ASSIGNMENT,
        job=job,
        to_phone=job.cleaner.phone,
        recipient_user=job.cleaner,
        triggered_by=triggered_by,
    )


def send_whatsapp_completion(job, triggered_by=None) -> bool:
    """
    Send WhatsApp completion notification to the company owner (if they have a phone).
    Called when a visit is marked completed.
    """
    from apps.maintenance.models import WhatsAppNotificationLog
    from apps.accounts.models import User

    try:
        owner = User.objects.filter(
            company=job.company, role=User.ROLE_OWNER, is_active=True
        ).exclude(phone="").first()
    except Exception:
        return False

    if not owner or not owner.phone:
        return False

    return send_whatsapp_notification(
        company=job.company,
        kind=WhatsAppNotificationLog.KIND_COMPLETION,
        job=job,
        to_phone=owner.phone,
        recipient_user=owner,
        triggered_by=triggered_by,
    )


def send_whatsapp_sla_warning(job, triggered_by=None) -> bool:
    """
    Send WhatsApp SLA warning to technician and owner (if they have phones).
    Returns True if at least one message sent successfully.
    """
    from apps.maintenance.models import WhatsAppNotificationLog
    from apps.accounts.models import User

    sent_any = False

    # Notify technician
    if job.cleaner and job.cleaner.phone:
        ok = send_whatsapp_notification(
            company=job.company,
            kind=WhatsAppNotificationLog.KIND_SLA_WARNING,
            job=job,
            to_phone=job.cleaner.phone,
            recipient_user=job.cleaner,
            triggered_by=triggered_by,
        )
        if ok:
            sent_any = True

    # Notify owner
    try:
        owner = User.objects.filter(
            company=job.company, role=User.ROLE_OWNER, is_active=True
        ).exclude(phone="").first()
    except Exception:
        owner = None

    if owner and owner.phone:
        ok = send_whatsapp_notification(
            company=job.company,
            kind=WhatsAppNotificationLog.KIND_SLA_WARNING,
            job=job,
            to_phone=owner.phone,
            recipient_user=owner,
            triggered_by=triggered_by,
        )
        if ok:
            sent_any = True

    return sent_any
