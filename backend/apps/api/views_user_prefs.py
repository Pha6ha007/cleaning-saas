# backend/apps/api/views_user_prefs.py
"""
User Notification Preferences API (M004/S04)

GET  /api/user/notification-preferences/  — read current preferences
PATCH /api/user/notification-preferences/ — update preferences

Schema (extends existing User.notification_preferences JSONField):

    {
        "email_enabled": true,
        "whatsapp_enabled": false,
        "job_assignment": true,      // receive assignment notifications
        "sla_warning": true,         // receive SLA warning notifications
        "completion": true,          // receive completion notifications
        "frequency": "immediate",    // "immediate" | "daily_digest"
        "quiet_hours_enabled": false,
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "07:00",
        "weekly_summary": false,
    }

Quiet hours logic:
- If quiet_hours_enabled is True, notifications are suppressed between
  quiet_hours_start and quiet_hours_end (local time, Dubai timezone)
- is_in_quiet_hours(user) helper is importable from this module and used
  by send_maintenance_notification() and send_whatsapp_notification()

The JSONField stores only the keys explicitly set; defaults fill the rest.
"""

import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

# Default preference values
DEFAULT_PREFERENCES = {
    "email_enabled": True,
    "whatsapp_enabled": False,
    "job_assignment": True,
    "sla_warning": True,
    "completion": True,
    "frequency": "immediate",
    "quiet_hours_enabled": False,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
    "weekly_summary": False,
}

# Valid frequency values
VALID_FREQUENCIES = {"immediate", "daily_digest"}


def get_notification_preferences(user) -> dict:
    """Return merged preferences dict (stored values + defaults for missing keys)."""
    stored = user.notification_preferences or {}
    return {**DEFAULT_PREFERENCES, **stored}


def is_in_quiet_hours(user) -> bool:
    """
    Check if current time (Dubai timezone) falls within the user's quiet hours.
    Returns False if quiet hours are disabled or misconfigured.
    """
    prefs = get_notification_preferences(user)
    if not prefs.get("quiet_hours_enabled"):
        return False

    start_str = prefs.get("quiet_hours_start", "22:00")
    end_str = prefs.get("quiet_hours_end", "07:00")

    try:
        from datetime import time as dt_time
        from zoneinfo import ZoneInfo
        dubai_tz = ZoneInfo("Asia/Dubai")
        now_local = timezone.now().astimezone(dubai_tz)
        now_time = now_local.time().replace(second=0, microsecond=0)

        start_h, start_m = map(int, start_str.split(":"))
        end_h, end_m = map(int, end_str.split(":"))
        start = dt_time(start_h, start_m)
        end = dt_time(end_h, end_m)

        if start <= end:
            # Simple range: e.g. 09:00 - 17:00
            return start <= now_time <= end
        else:
            # Overnight range: e.g. 22:00 - 07:00
            return now_time >= start or now_time <= end

    except Exception as exc:
        logger.warning("is_in_quiet_hours: failed for user %s: %s", user.id, exc)
        return False


def _validate_preferences(data: dict) -> tuple[dict, dict]:
    """
    Validate and clean preference data.
    Returns (cleaned_data, errors).
    """
    cleaned = {}
    errors = {}

    bool_fields = ["email_enabled", "whatsapp_enabled", "job_assignment",
                   "sla_warning", "completion", "quiet_hours_enabled", "weekly_summary"]
    for field in bool_fields:
        if field in data:
            val = data[field]
            if not isinstance(val, bool):
                errors[field] = f"Must be a boolean, got {type(val).__name__}"
            else:
                cleaned[field] = val

    if "frequency" in data:
        if data["frequency"] not in VALID_FREQUENCIES:
            errors["frequency"] = f"Must be one of: {', '.join(VALID_FREQUENCIES)}"
        else:
            cleaned["frequency"] = data["frequency"]

    for time_field in ["quiet_hours_start", "quiet_hours_end"]:
        if time_field in data:
            val = data[time_field]
            try:
                h, m = val.split(":")
                assert 0 <= int(h) <= 23 and 0 <= int(m) <= 59
                cleaned[time_field] = f"{int(h):02d}:{int(m):02d}"
            except Exception:
                errors[time_field] = "Must be HH:MM format (e.g. '22:00')"

    return cleaned, errors


class NotificationPreferencesView(APIView):
    """
    User notification preferences.

    GET  /api/user/notification-preferences/ → full preferences dict with defaults
    PATCH /api/user/notification-preferences/ → partial update, returns updated prefs
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs = get_notification_preferences(request.user)
        return Response(prefs)

    def patch(self, request):
        data = request.data
        if not data:
            return Response(
                {"code": "EMPTY_BODY", "message": "No preferences provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaned, errors = _validate_preferences(data)
        if errors:
            return Response(
                {"code": "VALIDATION_ERROR", "fields": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Merge with existing stored prefs
        user = request.user
        current = user.notification_preferences or {}
        current.update(cleaned)
        user.notification_preferences = current
        user.save(update_fields=["notification_preferences", "updated_at"])

        return Response(get_notification_preferences(user))
