# backend/apps/api/views_audit_log.py
"""
M005/S04: Audit Log Viewer API

JobCheckEvent records are immutable (enforced at model level). This view
provides a read-only, filterable, paginated view over them.

Routes:
    GET /api/jobs/audit-log/         — paginated list with filters
    GET /api/jobs/audit-log/export/  — CSV download (StreamingHttpResponse)

Filters (query params):
    cleaner_id  — filter by cleaner user ID
    location_id — filter by job location
    date_from   — ISO date (YYYY-MM-DD), inclusive
    date_to     — ISO date (YYYY-MM-DD), inclusive
    event_type  — check_in | check_out | force_complete
    page        — page number (default 1)
    page_size   — items per page (default 50, max 200)

CSV export applies the same filters, no pagination.
"""

import csv
import logging
from datetime import date as dt_date
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.jobs.models import JobCheckEvent
from .permissions import IsManagerUser

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def _parse_date(value: str | None) -> dt_date | None:
    if not value:
        return None
    try:
        return dt_date.fromisoformat(value)
    except ValueError:
        return None


def _build_queryset(company, params):
    """Build filtered QuerySet for JobCheckEvent based on query params."""
    qs = JobCheckEvent.objects.filter(
        job__company=company,
    ).select_related(
        "job", "job__location", "user"
    ).order_by("-created_at")

    cleaner_id = params.get("cleaner_id")
    if cleaner_id:
        try:
            qs = qs.filter(user_id=int(cleaner_id), user__company=company)
        except (ValueError, TypeError):
            pass

    location_id = params.get("location_id")
    if location_id:
        try:
            qs = qs.filter(job__location_id=int(location_id))
        except (ValueError, TypeError):
            pass

    date_from = _parse_date(params.get("date_from"))
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)

    date_to = _parse_date(params.get("date_to"))
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    event_type = params.get("event_type")
    valid_types = {c[0] for c in JobCheckEvent.EVENT_TYPES}
    if event_type and event_type in valid_types:
        qs = qs.filter(event_type=event_type)

    return qs


def _event_to_dict(event: JobCheckEvent) -> dict:
    return {
        "id": event.id,
        "job_id": event.job_id,
        "event_type": event.event_type,
        "cleaner": {
            "id": event.user_id,
            "full_name": event.user.full_name if event.user else None,
            "email": event.user.email if event.user else None,
        } if event.user_id else None,
        "location": {
            "id": event.job.location_id,
            "name": event.job.location.name if event.job.location else None,
        },
        "latitude": event.latitude,
        "longitude": event.longitude,
        "distance_m": event.distance_m,
        "created_at": event.created_at.isoformat(),
    }


class AuditLogView(APIView):
    """
    GET /api/jobs/audit-log/

    Returns paginated JobCheckEvent history with filters.
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request):
        company = request.user.company
        qs = _build_queryset(company, request.query_params)

        # Pagination
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            page_size = min(
                MAX_PAGE_SIZE,
                max(1, int(request.query_params.get("page_size", DEFAULT_PAGE_SIZE)))
            )
        except (ValueError, TypeError):
            page_size = DEFAULT_PAGE_SIZE

        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        events = qs[start:end]

        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
            "results": [_event_to_dict(e) for e in events],
        })


class AuditLogExportView(APIView):
    """
    GET /api/jobs/audit-log/export/

    Streams a CSV file with all matching audit log events.
    Applies the same filters as AuditLogView; no pagination.
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request):
        company = request.user.company
        qs = _build_queryset(company, request.query_params)

        response = StreamingHttpResponse(
            _stream_csv(qs),
            content_type="text/csv",
        )
        filename = f"audit_log_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class Echo:
    """Minimal pseudo-buffer for StreamingHttpResponse CSV."""
    def write(self, value):
        return value


def _stream_csv(queryset):
    """Generator that yields CSV rows for streaming."""
    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)

    # Header
    yield writer.writerow([
        "ID", "Job ID", "Event Type",
        "Cleaner Name", "Cleaner Email",
        "Location", "Latitude", "Longitude", "Distance (m)",
        "Created At",
    ])

    for event in queryset.iterator(chunk_size=500):
        cleaner_name = event.user.full_name if event.user else ""
        cleaner_email = event.user.email if event.user else ""
        location_name = event.job.location.name if event.job.location else ""
        yield writer.writerow([
            event.id,
            event.job_id,
            event.event_type,
            cleaner_name,
            cleaner_email,
            location_name,
            event.latitude or "",
            event.longitude or "",
            round(event.distance_m, 1) if event.distance_m is not None else "",
            event.created_at.isoformat(),
        ])
