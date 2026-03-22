# backend/apps/api/views_branches.py
"""
M005/S01: Multi-Branch Hierarchy API

Provides CRUD for Branch objects and branch-level analytics rollup.

Enterprise gate: companies on TIER_ENTERPRISE may have unlimited branches.
Standard/Pro companies are limited to 1 branch (advisory — they can still
organise locations but the branch feature is basically a label).

Routes (all require authentication + manager role):
    GET  /api/branches/                    — list company's branches
    POST /api/branches/                    — create branch (enterprise: unlimited; others: max 1)
    GET  /api/branches/<id>/               — retrieve branch
    PATCH /api/branches/<id>/              — update branch (name, description, manager, is_active)
    DELETE /api/branches/<id>/             — delete branch (only if no active locations)
    GET  /api/branches/<id>/analytics/     — job KPI rollup for this branch
"""

import logging
from datetime import date, timedelta
from django.db.models import Count, Q, F
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .cache_utils import cached_response, invalidate, make_company_key
from rest_framework.views import APIView

from apps.accounts.models import Branch, Company, User
from apps.jobs.models import Job
from .permissions import IsManagerUser

logger = logging.getLogger(__name__)

# Maximum branches for non-enterprise plans
BRANCH_LIMIT_NON_ENTERPRISE = 1


def _branch_to_dict(branch: Branch, include_location_count: bool = True) -> dict:
    data = {
        "id": branch.id,
        "name": branch.name,
        "description": branch.description,
        "is_active": branch.is_active,
        "manager": None,
        "created_at": branch.created_at.isoformat(),
        "updated_at": branch.updated_at.isoformat(),
    }
    if branch.manager_id:
        data["manager"] = {
            "id": branch.manager_id,
            "full_name": branch.manager.full_name,
            "email": branch.manager.email,
        }
    if include_location_count:
        data["location_count"] = branch.locations.filter(is_active=True).count()
    return data


class BranchListCreateView(APIView):
    """
    GET  /api/branches/   — list all branches for the authenticated manager's company
    POST /api/branches/   — create a new branch
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request):
        company = request.user.company
        branches = Branch.objects.filter(company=company).select_related("manager")
        return Response([_branch_to_dict(b) for b in branches])

    def post(self, request):
        user = request.user
        company = user.company

        # Only owner can create branches
        if user.role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return Response(
                {"code": "PERMISSION_DENIED", "message": "Only owner/manager can create branches."},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = request.data.get("name", "").strip()
        if not name:
            return Response(
                {"code": "NAME_REQUIRED", "message": "Branch name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Branch.objects.filter(company=company, name=name).exists():
            return Response(
                {"code": "NAME_CONFLICT", "message": f"A branch named '{name}' already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enterprise gate (after name checks so duplicate name gives 400, not 403)
        is_enterprise = company.plan_tier == Company.TIER_ENTERPRISE
        current_count = Branch.objects.filter(company=company).count()
        if not is_enterprise and current_count >= BRANCH_LIMIT_NON_ENTERPRISE:
            return Response(
                {
                    "code": "BRANCH_LIMIT_REACHED",
                    "message": (
                        f"Your plan allows up to {BRANCH_LIMIT_NON_ENTERPRISE} branch. "
                        "Upgrade to Enterprise for unlimited branches."
                    ),
                    "current_count": current_count,
                    "limit": BRANCH_LIMIT_NON_ENTERPRISE,
                    "upgrade_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Optional manager assignment
        manager = None
        manager_id = request.data.get("manager_id")
        if manager_id:
            try:
                manager = User.objects.get(
                    pk=manager_id,
                    company=company,
                    role__in=[User.ROLE_MANAGER, User.ROLE_OWNER],
                )
            except User.DoesNotExist:
                return Response(
                    {"code": "MANAGER_NOT_FOUND", "message": "Manager not found in this company."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        branch = Branch.objects.create(
            company=company,
            name=name,
            description=request.data.get("description", ""),
            manager=manager,
            is_active=request.data.get("is_active", True),
        )
        return Response(_branch_to_dict(branch), status=status.HTTP_201_CREATED)


class BranchDetailView(APIView):
    """
    GET    /api/branches/<id>/  — retrieve
    PATCH  /api/branches/<id>/  — update
    DELETE /api/branches/<id>/  — delete (only if no active locations assigned)
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def _get_branch(self, request, pk):
        try:
            return Branch.objects.select_related("manager").get(
                pk=pk, company=request.user.company
            )
        except Branch.DoesNotExist:
            return None

    def get(self, request, pk):
        branch = self._get_branch(request, pk)
        if branch is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_branch_to_dict(branch))

    def patch(self, request, pk):
        branch = self._get_branch(request, pk)
        if branch is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        update_fields = []

        if "name" in request.data:
            name = request.data["name"].strip()
            if not name:
                return Response(
                    {"code": "NAME_REQUIRED", "message": "Branch name cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            conflict = Branch.objects.filter(
                company=branch.company, name=name
            ).exclude(pk=branch.pk).exists()
            if conflict:
                return Response(
                    {"code": "NAME_CONFLICT", "message": f"A branch named '{name}' already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            branch.name = name
            update_fields.append("name")

        if "description" in request.data:
            branch.description = request.data["description"]
            update_fields.append("description")

        if "is_active" in request.data:
            if not isinstance(request.data["is_active"], bool):
                return Response(
                    {"code": "INVALID_FIELD", "message": "is_active must be a boolean."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            branch.is_active = request.data["is_active"]
            update_fields.append("is_active")

        if "manager_id" in request.data:
            mid = request.data["manager_id"]
            if mid is None:
                branch.manager = None
            else:
                try:
                    mgr = User.objects.get(
                        pk=mid, company=branch.company,
                        role__in=[User.ROLE_MANAGER, User.ROLE_OWNER],
                    )
                    branch.manager = mgr
                except User.DoesNotExist:
                    return Response(
                        {"code": "MANAGER_NOT_FOUND", "message": "Manager not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            update_fields.append("manager")

        if update_fields:
            branch.updated_at = timezone.now()
            update_fields.append("updated_at")
            branch.save(update_fields=update_fields)

        return Response(_branch_to_dict(branch))

    def delete(self, request, pk):
        if request.user.role != User.ROLE_OWNER:
            return Response(
                {"code": "PERMISSION_DENIED", "message": "Only owner can delete branches."},
                status=status.HTTP_403_FORBIDDEN,
            )
        branch = self._get_branch(request, pk)
        if branch is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        # Guard: cannot delete if active locations are assigned
        active_locations = branch.locations.filter(is_active=True).count()
        if active_locations > 0:
            return Response(
                {
                    "code": "BRANCH_HAS_LOCATIONS",
                    "message": (
                        f"Cannot delete branch with {active_locations} active location(s). "
                        "Reassign or deactivate locations first."
                    ),
                    "active_location_count": active_locations,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        branch.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BranchAnalyticsView(APIView):
    """
    GET /api/branches/<id>/analytics/

    Returns job KPI rollup for all locations in this branch.
    Covers last 30 days by default; accepts ?days=N query param (max 365).

    Response:
        {
            "branch_id": 1,
            "branch_name": "Downtown",
            "period_days": 30,
            "location_count": 5,
            "total_jobs": 120,
            "completed_jobs": 98,
            "completion_rate": 81.7,
            "in_progress_jobs": 4,
            "cancelled_jobs": 3,
            "sla_breaches": 7,
            "sla_breach_rate": 7.1,
            "locations": [
                {"id": 1, "name": "HQ", "total_jobs": 40, "completed_jobs": 35, ...},
                ...
            ]
        }
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request, pk):
        try:
            branch = Branch.objects.get(pk=pk, company=request.user.company)
        except Branch.DoesNotExist:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        try:
            days = min(int(request.query_params.get("days", 30)), 365)
            if days < 1:
                days = 30
        except (ValueError, TypeError):
            days = 30

        cache_key = make_company_key("branch_analytics", request.user.company.id, pk, days)

        def _compute():
            from datetime import date, timedelta

            since = date.today() - timedelta(days=days)
            locations = branch.locations.filter(is_active=True).values("id", "name")
            location_ids = [l["id"] for l in locations]

            base_qs = Job.objects.filter(
                location_id__in=location_ids,
                context=Job.CONTEXT_CLEANING,
            )
            period_qs = base_qs.filter(scheduled_date__gte=since)

            loc_stats = {}
            for loc in locations:
                loc_qs = period_qs.filter(location_id=loc["id"])
                total = loc_qs.count()
                completed = loc_qs.filter(status=Job.STATUS_COMPLETED).count()
                cancelled = loc_qs.filter(status=Job.STATUS_CANCELLED).count()
                in_prog = loc_qs.filter(status=Job.STATUS_IN_PROGRESS).count()
                loc_stats[loc["id"]] = {
                    "id": loc["id"],
                    "name": loc["name"],
                    "total_jobs": total,
                    "completed_jobs": completed,
                    "in_progress_jobs": in_prog,
                    "cancelled_jobs": cancelled,
                    "completion_rate": round(completed / total * 100, 1) if total else 0.0,
                }

            total_jobs = sum(s["total_jobs"] for s in loc_stats.values())
            completed_jobs = sum(s["completed_jobs"] for s in loc_stats.values())
            cancelled_jobs = sum(s["cancelled_jobs"] for s in loc_stats.values())
            in_progress = sum(s["in_progress_jobs"] for s in loc_stats.values())

            sla_breaches = period_qs.filter(
                status=Job.STATUS_COMPLETED,
                actual_end_time__isnull=False,
                sla_deadline__isnull=False,
            ).filter(actual_end_time__gt=F("sla_deadline")).count()

            return {
                "branch_id": branch.id,
                "branch_name": branch.name,
                "period_days": days,
                "location_count": len(location_ids),
                "total_jobs": total_jobs,
                "completed_jobs": completed_jobs,
                "in_progress_jobs": in_progress,
                "cancelled_jobs": cancelled_jobs,
                "completion_rate": round(completed_jobs / total_jobs * 100, 1) if total_jobs else 0.0,
                "sla_breaches": sla_breaches,
                "sla_breach_rate": round(sla_breaches / completed_jobs * 100, 1) if completed_jobs else 0.0,
                "locations": list(loc_stats.values()),
            }

        data, hit = cached_response(cache_key, ttl=120, fn=_compute)
        resp = Response(data)
        resp["X-Cache"] = "HIT" if hit else "MISS"
        return resp
