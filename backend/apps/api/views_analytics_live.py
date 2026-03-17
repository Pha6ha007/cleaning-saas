# backend/apps/api/views_analytics_live.py
"""
Live KPI Analytics Polling Endpoint (M004/S03)

GET /api/analytics/live/

Returns today's KPIs for the authenticated manager:
- jobs_scheduled: count scheduled for today
- jobs_in_progress: currently in-progress
- jobs_completed: completed today
- sla_breaches_today: jobs that breached SLA today
- active_cleaners: cleaners with at least one in-progress job today

Response is cached for 30 seconds per company (keyed by company_id).
No WebSocket / django-channels required.

Client should poll this endpoint every 30s for "real-time" feel.
Last-Updated header indicates cache timestamp.
"""

import logging
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.jobs.models import Job
from .permissions import IsManagerUser

logger = logging.getLogger(__name__)

# Cache TTL in seconds
LIVE_CACHE_TTL = 30


def _compute_live_kpis(company) -> dict:
    """
    Compute today's live KPIs for a company.
    Called only on cache miss; result is cached for LIVE_CACHE_TTL seconds.
    """
    now = timezone.now()
    today = timezone.localdate()

    base_qs = Job.objects.filter(
        company=company,
        context=Job.CONTEXT_CLEANING,  # cleaning context only (Cleaning product scope)
    )

    # Jobs scheduled for today (any status except cancelled)
    jobs_scheduled = base_qs.filter(
        scheduled_date=today,
        status=Job.STATUS_SCHEDULED,
    ).count()

    jobs_in_progress = base_qs.filter(
        scheduled_date=today,
        status=Job.STATUS_IN_PROGRESS,
    ).count()

    jobs_completed_today = base_qs.filter(
        status=Job.STATUS_COMPLETED,
        actual_end_time__date=today,
    ).count()

    # SLA breaches: completed jobs where actual_end_time > scheduled_end_time (today)
    sla_breaches = 0
    completed_today = base_qs.filter(
        status=Job.STATUS_COMPLETED,
        actual_end_time__date=today,
        actual_end_time__isnull=False,
        scheduled_date=today,
        scheduled_end_time__isnull=False,
    )
    for job in completed_today.iterator(chunk_size=200):
        if job.actual_end_time and job.scheduled_end_time and job.scheduled_date:
            from datetime import datetime
            scheduled_end_naive = datetime.combine(job.scheduled_date, job.scheduled_end_time)
            scheduled_end_dt = timezone.make_aware(scheduled_end_naive)
            if job.actual_end_time > scheduled_end_dt:
                sla_breaches += 1

    # Active cleaners: distinct cleaners with in-progress jobs today
    active_cleaners = base_qs.filter(
        scheduled_date=today,
        status=Job.STATUS_IN_PROGRESS,
        cleaner__isnull=False,
    ).values("cleaner").distinct().count()

    return {
        "jobs_scheduled": jobs_scheduled,
        "jobs_in_progress": jobs_in_progress,
        "jobs_completed": jobs_completed_today,
        "sla_breaches_today": sla_breaches,
        "active_cleaners": active_cleaners,
        "computed_at": now.isoformat(),
        "cache_ttl_seconds": LIVE_CACHE_TTL,
    }


class LiveAnalyticsView(APIView):
    """
    Live KPI polling endpoint for Dashboard.

    GET /api/analytics/live/

    Cached 30s per company. Poll every 30s from frontend for near-real-time updates.
    Returns 200 with KPI data + Last-Updated header.

    Authentication: JWT Bearer or Token
    Permission: Manager roles (owner, manager, staff)
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request):
        user = request.user
        company = user.company

        cache_key = f"live_kpis_company_{company.id}"
        cached = cache.get(cache_key)

        if cached is not None:
            response = Response(cached)
            response["X-Cache"] = "HIT"
            response["Last-Updated"] = cached.get("computed_at", "")
            return response

        kpis = _compute_live_kpis(company)
        cache.set(cache_key, kpis, timeout=LIVE_CACHE_TTL)

        response = Response(kpis)
        response["X-Cache"] = "MISS"
        response["Last-Updated"] = kpis["computed_at"]
        return response
