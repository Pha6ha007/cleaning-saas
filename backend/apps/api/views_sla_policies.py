# backend/apps/api/views_sla_policies.py
"""
M005/S03: Advanced SLA Configuration API

Routes:
    GET  /api/sla-policies/           — list company's SLA policies
    POST /api/sla-policies/           — create policy
    GET  /api/sla-policies/<id>/      — retrieve
    PATCH /api/sla-policies/<id>/     — update
    DELETE /api/sla-policies/<id>/    — delete (only if no locations reference it)
"""

import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.jobs.models import SLAPolicy, get_effective_sla_policy
from apps.accounts.models import User
from .permissions import IsManagerUser
from .cache_utils import cached_response, invalidate, make_company_key

logger = logging.getLogger(__name__)


def _policy_to_dict(p: SLAPolicy) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "gps_radius_m": p.gps_radius_m,
        "check_in_window_minutes": p.check_in_window_minutes,
        "check_out_window_minutes": p.check_out_window_minutes,
        "required_proof_photo": p.required_proof_photo,
        "required_proof_checklist": p.required_proof_checklist,
        "required_proof_signature": p.required_proof_signature,
        "is_default": p.is_default,
        "location_count": p.locations.count() if p.pk else 0,
        "created_at": p.created_at.isoformat() if p.pk else None,
        "updated_at": p.updated_at.isoformat() if p.pk else None,
    }


def _validate_policy_data(data: dict, partial: bool = False) -> tuple[dict, dict]:
    cleaned = {}
    errors = {}

    if not partial or "name" in data:
        name = data.get("name", "").strip()
        if not name:
            errors["name"] = "Name is required."
        else:
            cleaned["name"] = name

    if "description" in data:
        cleaned["description"] = str(data["description"])

    if not partial or "gps_radius_m" in data:
        val = data.get("gps_radius_m")
        if val is not None:
            try:
                val = int(val)
                if val < 10 or val > 10000:
                    errors["gps_radius_m"] = "Must be between 10 and 10000 metres."
                else:
                    cleaned["gps_radius_m"] = val
            except (TypeError, ValueError):
                errors["gps_radius_m"] = "Must be an integer."

    for window_field in ["check_in_window_minutes", "check_out_window_minutes"]:
        if window_field in data:
            try:
                val = int(data[window_field])
                if val < 0 or val > 480:
                    errors[window_field] = "Must be 0–480 minutes."
                else:
                    cleaned[window_field] = val
            except (TypeError, ValueError):
                errors[window_field] = "Must be an integer."

    for bool_field in ["required_proof_photo", "required_proof_checklist",
                       "required_proof_signature", "is_default"]:
        if bool_field in data:
            val = data[bool_field]
            if not isinstance(val, bool):
                errors[bool_field] = "Must be a boolean."
            else:
                cleaned[bool_field] = val

    return cleaned, errors


class SLAPolicyListCreateView(APIView):
    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request):
        company = request.user.company
        cache_key = make_company_key("sla_policies", company.id)

        def _fetch():
            policies = SLAPolicy.objects.filter(
                company=company
            ).prefetch_related("locations")
            return [_policy_to_dict(p) for p in policies]

        data, hit = cached_response(cache_key, ttl=60, fn=_fetch)
        resp = Response(data)
        resp["X-Cache"] = "HIT" if hit else "MISS"
        return resp

    def post(self, request):
        cleaned, errors = _validate_policy_data(request.data, partial=False)
        if errors:
            return Response(
                {"code": "VALIDATION_ERROR", "fields": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        policy = SLAPolicy(company=request.user.company, **cleaned)
        policy.save()
        invalidate(make_company_key("sla_policies", request.user.company.id))
        return Response(_policy_to_dict(policy), status=status.HTTP_201_CREATED)


class SLAPolicyDetailView(APIView):
    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def _get_policy(self, request, pk):
        try:
            return SLAPolicy.objects.prefetch_related("locations").get(
                pk=pk, company=request.user.company
            )
        except SLAPolicy.DoesNotExist:
            return None

    def get(self, request, pk):
        p = self._get_policy(request, pk)
        if p is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_policy_to_dict(p))

    def patch(self, request, pk):
        p = self._get_policy(request, pk)
        if p is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        cleaned, errors = _validate_policy_data(request.data, partial=True)
        if errors:
            return Response(
                {"code": "VALIDATION_ERROR", "fields": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for field, value in cleaned.items():
            setattr(p, field, value)

        if cleaned:
            p.updated_at = timezone.now()
            p.save()
            invalidate(make_company_key("sla_policies", request.user.company.id))

        return Response(_policy_to_dict(p))

    def delete(self, request, pk):
        if request.user.role != User.ROLE_OWNER:
            return Response(
                {"code": "PERMISSION_DENIED", "message": "Only owner can delete SLA policies."},
                status=status.HTTP_403_FORBIDDEN,
            )
        p = self._get_policy(request, pk)
        if p is None:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        # Guard: locations still reference this policy
        loc_count = p.locations.filter(is_active=True).count()
        if loc_count > 0:
            return Response(
                {
                    "code": "POLICY_IN_USE",
                    "message": (
                        f"Cannot delete: {loc_count} active location(s) use this policy. "
                        "Reassign their SLA policy first."
                    ),
                    "location_count": loc_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        p.delete()
        invalidate(make_company_key("sla_policies", request.user.company.id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class EffectiveSLAPolicyView(APIView):
    """
    GET /api/jobs/<job_id>/effective-sla-policy/

    Returns the effective SLA policy for a specific job, following the
    inheritance chain: job override → location policy → company default → platform default.
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request, job_pk):
        from apps.jobs.models import Job
        try:
            job = Job.objects.select_related(
                "sla_policy_override", "location__sla_policy", "company"
            ).get(pk=job_pk, company=request.user.company)
        except Job.DoesNotExist:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        policy = get_effective_sla_policy(job)
        data = _policy_to_dict(policy)
        data["source"] = _get_policy_source(job, policy)
        return Response(data)


def _get_policy_source(job, policy) -> str:
    """Describe where the effective policy came from."""
    if job.sla_policy_override_id and policy.pk == job.sla_policy_override_id:
        return "job_override"
    if job.location.sla_policy_id and policy.pk == job.location.sla_policy_id:
        return "location_policy"
    if policy.pk:
        return "company_default"
    return "platform_default"
