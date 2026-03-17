# backend/apps/api/views_recurring_jobs.py
"""
M005/S02: Recurring CleanProof Job Scheduling API

Routes:
    GET  /api/jobs/recurring/           — list templates for authenticated company
    POST /api/jobs/recurring/           — create template
    GET  /api/jobs/recurring/<id>/      — retrieve template
    PATCH /api/jobs/recurring/<id>/     — update (including pause/resume via is_active)
    DELETE /api/jobs/recurring/<id>/    — delete template
"""

import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.jobs.models import RecurringJobTemplate
from apps.accounts.models import User
from apps.locations.models import Location
from .permissions import IsManagerUser

logger = logging.getLogger(__name__)

VALID_FREQUENCIES = {
    RecurringJobTemplate.FREQUENCY_DAILY,
    RecurringJobTemplate.FREQUENCY_WEEKLY,
    RecurringJobTemplate.FREQUENCY_MONTHLY,
}


def _template_to_dict(t: RecurringJobTemplate) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "frequency": t.frequency,
        "day_of_week": t.day_of_week,
        "day_of_month": t.day_of_month,
        "location": {
            "id": t.location_id,
            "name": t.location.name,
        } if t.location_id else None,
        "cleaner": {
            "id": t.cleaner_id,
            "full_name": t.cleaner.full_name,
            "email": t.cleaner.email,
        } if t.cleaner_id else None,
        "checklist_template_id": t.checklist_template_id,
        "scheduled_start_time": str(t.scheduled_start_time) if t.scheduled_start_time else None,
        "scheduled_end_time": str(t.scheduled_end_time) if t.scheduled_end_time else None,
        "is_active": t.is_active,
        "last_generated_at": t.last_generated_at.isoformat() if t.last_generated_at else None,
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
    }


def _validate_template_data(data: dict, company, partial: bool = False) -> tuple[dict, dict]:
    """Validate and clean template data. Returns (cleaned, errors)."""
    cleaned = {}
    errors = {}

    if not partial or "name" in data:
        name = data.get("name", "").strip()
        if not name:
            errors["name"] = "Name is required."
        else:
            cleaned["name"] = name

    if not partial or "frequency" in data:
        freq = data.get("frequency", RecurringJobTemplate.FREQUENCY_WEEKLY)
        if freq not in VALID_FREQUENCIES:
            errors["frequency"] = f"Must be one of: {', '.join(sorted(VALID_FREQUENCIES))}"
        else:
            cleaned["frequency"] = freq

    if not partial or "location_id" in data:
        loc_id = data.get("location_id")
        if not partial and not loc_id:
            errors["location_id"] = "location_id is required."
        elif loc_id:
            try:
                cleaned["location"] = Location.objects.get(pk=loc_id, company=company)
            except Location.DoesNotExist:
                errors["location_id"] = "Location not found in this company."

    if "cleaner_id" in data:
        cid = data["cleaner_id"]
        if cid is None:
            cleaned["cleaner"] = None
        else:
            try:
                cleaned["cleaner"] = User.objects.get(
                    pk=cid, company=company, role=User.ROLE_CLEANER
                )
            except User.DoesNotExist:
                errors["cleaner_id"] = "Cleaner not found in this company."

    if "day_of_week" in data:
        dow = data["day_of_week"]
        if dow is not None and dow not in range(7):
            errors["day_of_week"] = "Must be 0-6 (0=Monday, 6=Sunday)."
        else:
            cleaned["day_of_week"] = dow

    if "day_of_month" in data:
        dom = data["day_of_month"]
        if dom is not None and not (1 <= dom <= 28):
            errors["day_of_month"] = "Must be 1-28."
        else:
            cleaned["day_of_month"] = dom

    for time_field in ["scheduled_start_time", "scheduled_end_time"]:
        if time_field in data:
            val = data[time_field]
            if val is None:
                cleaned[time_field] = None
            else:
                try:
                    h, m = str(val).split(":")[:2]
                    assert 0 <= int(h) <= 23 and 0 <= int(m) <= 59
                    cleaned[time_field] = f"{int(h):02d}:{int(m):02d}:00"
                except Exception:
                    errors[time_field] = "Must be HH:MM format."

    if "is_active" in data:
        val = data["is_active"]
        if not isinstance(val, bool):
            errors["is_active"] = "Must be a boolean."
        else:
            cleaned["is_active"] = val

    return cleaned, errors


class RecurringJobListCreateView(APIView):
    """
    GET  /api/jobs/recurring/  — list company's recurring templates
    POST /api/jobs/recurring/  — create template
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request):
        templates = RecurringJobTemplate.objects.filter(
            company=request.user.company
        ).select_related("location", "cleaner")
        return Response([_template_to_dict(t) for t in templates])

    def post(self, request):
        cleaned, errors = _validate_template_data(
            request.data, request.user.company, partial=False
        )
        if errors:
            return Response(
                {"code": "VALIDATION_ERROR", "fields": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        template = RecurringJobTemplate.objects.create(
            company=request.user.company,
            created_by=request.user,
            **cleaned,
        )
        return Response(_template_to_dict(template), status=status.HTTP_201_CREATED)


class RecurringJobDetailView(APIView):
    """
    GET    /api/jobs/recurring/<id>/  — retrieve
    PATCH  /api/jobs/recurring/<id>/  — update (partial)
    DELETE /api/jobs/recurring/<id>/  — delete
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def _get_template(self, request, pk):
        try:
            return RecurringJobTemplate.objects.select_related(
                "location", "cleaner"
            ).get(pk=pk, company=request.user.company)
        except RecurringJobTemplate.DoesNotExist:
            return None

    def get(self, request, pk):
        t = self._get_template(request, pk)
        if t is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_template_to_dict(t))

    def patch(self, request, pk):
        t = self._get_template(request, pk)
        if t is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        cleaned, errors = _validate_template_data(
            request.data, request.user.company, partial=True
        )
        if errors:
            return Response(
                {"code": "VALIDATION_ERROR", "fields": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for field, value in cleaned.items():
            setattr(t, field, value)

        if cleaned:
            t.updated_at = timezone.now()
            t.save()

        return Response(_template_to_dict(t))

    def delete(self, request, pk):
        t = self._get_template(request, pk)
        if t is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)
        t.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
