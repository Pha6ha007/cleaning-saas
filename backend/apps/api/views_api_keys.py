# backend/apps/api/views_api_keys.py
"""
M006/S04: Enterprise API Key Management API

Routes:
    GET  /api/enterprise/api-keys/          — list company's API keys (no raw key)
    POST /api/enterprise/api-keys/          — create key (raw key returned once)
    DELETE /api/enterprise/api-keys/<id>/   — revoke key
    GET  /api/enterprise/api-keys/usage/    — per-key usage stats

Enterprise gate: company.plan_tier must be TIER_ENTERPRISE.
Only owners can create/delete keys.
"""

import logging
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.api.models_api_keys import EnterpriseApiKey, ALL_SCOPES
from .permissions import IsManagerUser
from .authentication_api_key import EnterpriseApiKeyAuthentication

logger = logging.getLogger(__name__)


def _key_to_dict(key: EnterpriseApiKey, include_raw: str | None = None) -> dict:
    d = {
        "id": key.id,
        "name": key.name,
        "prefix": key.prefix,
        "scopes": key.scopes,
        "is_active": key.is_active,
        "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
        "request_count": key.request_count,
        "created_at": key.created_at.isoformat(),
    }
    if include_raw:
        d["key"] = include_raw
        d["key_warning"] = "This is the only time the raw key will be shown. Store it securely."
    return d


class ApiKeyListCreateView(APIView):
    """
    GET  /api/enterprise/api-keys/  — list all keys for the company
    POST /api/enterprise/api-keys/  — create a new key
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication, EnterpriseApiKeyAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def _check_enterprise(self, company: Company) -> Response | None:
        if company.plan_tier != Company.TIER_ENTERPRISE:
            return Response(
                {
                    "code": "ENTERPRISE_REQUIRED",
                    "message": "API keys are only available on the Enterprise plan.",
                    "upgrade_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request):
        gate = self._check_enterprise(request.user.company)
        if gate:
            return gate
        keys = EnterpriseApiKey.objects.filter(company=request.user.company)
        return Response([_key_to_dict(k) for k in keys])

    def post(self, request):
        gate = self._check_enterprise(request.user.company)
        if gate:
            return gate

        if request.user.role != User.ROLE_OWNER:
            return Response(
                {"code": "OWNER_REQUIRED", "message": "Only owners can create API keys."},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = request.data.get("name", "").strip()
        if not name:
            return Response(
                {"code": "NAME_REQUIRED", "message": "API key name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scopes = request.data.get("scopes", [])
        if not isinstance(scopes, list):
            scopes = []
        # Validate scopes
        invalid = [s for s in scopes if s not in ALL_SCOPES]
        if invalid:
            return Response(
                {
                    "code": "INVALID_SCOPES",
                    "message": f"Invalid scopes: {invalid}. Valid: {ALL_SCOPES}",
                    "valid_scopes": ALL_SCOPES,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not scopes:
            scopes = list(ALL_SCOPES)  # Default: all scopes

        # Enforce per-company key limit (20 keys max)
        if EnterpriseApiKey.objects.filter(company=request.user.company).count() >= 20:
            return Response(
                {"code": "KEY_LIMIT_REACHED", "message": "Maximum 20 API keys per company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance, raw_key = EnterpriseApiKey.generate(
            company=request.user.company,
            name=name,
            scopes=scopes,
        )
        return Response(_key_to_dict(instance, include_raw=raw_key), status=status.HTTP_201_CREATED)


class ApiKeyDetailView(APIView):
    """
    DELETE /api/enterprise/api-keys/<id>/  — revoke key
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication, EnterpriseApiKeyAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def delete(self, request, pk):
        if request.user.role != User.ROLE_OWNER:
            return Response(
                {"code": "OWNER_REQUIRED", "message": "Only owners can revoke API keys."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            key = EnterpriseApiKey.objects.get(pk=pk, company=request.user.company)
        except EnterpriseApiKey.DoesNotExist:
            return Response({"code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        key.is_active = False
        key.save(update_fields=["is_active"])
        logger.info("ApiKey revoked: id=%d by user=%d", key.id, request.user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApiKeyUsageView(APIView):
    """
    GET /api/enterprise/api-keys/usage/  — per-key usage stats
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication, EnterpriseApiKeyAuthentication]
    permission_classes = [IsAuthenticated, IsManagerUser]

    def get(self, request):
        if request.user.company.plan_tier != Company.TIER_ENTERPRISE:
            return Response(
                {"code": "ENTERPRISE_REQUIRED"},
                status=status.HTTP_403_FORBIDDEN,
            )

        keys = EnterpriseApiKey.objects.filter(company=request.user.company)
        usage = []
        for key in keys:
            usage.append({
                "id": key.id,
                "name": key.name,
                "prefix": key.prefix,
                "is_active": key.is_active,
                "request_count": key.request_count,
                "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
                "created_at": key.created_at.isoformat(),
            })

        return Response({
            "total_keys": len(usage),
            "active_keys": sum(1 for k in usage if k["is_active"]),
            "total_requests": sum(k["request_count"] for k in usage),
            "keys": usage,
        })
