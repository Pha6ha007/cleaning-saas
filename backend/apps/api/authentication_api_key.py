# backend/apps/api/authentication_api_key.py
"""
M006/S04: Enterprise API Key Authentication

DRF authentication class that accepts X-API-Key header.
On success, sets request.user to the company owner (for permission checks)
and attaches request._api_key_instance for throttle identification.
"""

import logging
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

HEADER_NAME = "HTTP_X_API_KEY"


class EnterpriseApiKeyAuthentication(BaseAuthentication):
    """
    Authenticate via X-API-Key header.

    On success:
        - request.user = company's primary owner (for IsManagerUser compat)
        - request._api_key_instance = EnterpriseApiKey instance
        - Returns (user, api_key) tuple

    On miss (no header): returns None — falls through to next authenticator.
    On invalid key: raises AuthenticationFailed.
    """

    def authenticate(self, request):
        raw_key = request.META.get(HEADER_NAME)
        if not raw_key:
            return None  # Let other authenticators try

        from apps.api.models_api_keys import EnterpriseApiKey
        key_instance = EnterpriseApiKey.verify(raw_key)
        if key_instance is None:
            raise AuthenticationFailed("Invalid or inactive API key.")

        # Attach key to request for throttle and scope checks
        request._api_key_instance = key_instance

        # Record usage asynchronously (fire-and-forget; ignore failures)
        try:
            key_instance.record_usage()
        except Exception:
            logger.warning("Failed to record API key usage: key_id=%d", key_instance.id)

        # Find the owner user for this company (for permission compat)
        from apps.accounts.models import User
        owner = (
            User.objects.filter(
                company=key_instance.company,
                role__in=[User.ROLE_OWNER, User.ROLE_MANAGER],
                is_active=True,
            )
            .order_by("role")  # ROLE_OWNER < ROLE_MANAGER alphabetically? use id
            .first()
        )
        if owner is None:
            raise AuthenticationFailed("No active owner found for this API key's company.")

        return (owner, key_instance)

    def authenticate_header(self, request):
        return "X-API-Key"
