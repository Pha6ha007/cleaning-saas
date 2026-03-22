# backend/apps/api/throttles.py
"""
M006/S04: Granular Rate Limiting

Per-endpoint throttle scopes applied to unlocked views only.
Locked views (views_manager_jobs.py, views_cleaner.py) are NOT touched.

Scope rates are configured in settings.REST_FRAMEWORK.DEFAULT_THROTTLE_RATES.

Enterprise API Key holders use ApiKeyRateThrottle with a much higher daily limit,
bypassing the per-user throttles on applicable endpoints.
"""

from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle


# =============================================================================
# Auth Throttles — tighter limits to prevent brute force / abuse
# =============================================================================


class AuthLoginThrottle(ScopedRateThrottle):
    """5 login attempts per minute per IP."""
    scope = "auth_login"


class AuthSignupThrottle(ScopedRateThrottle):
    """3 signup attempts per minute per IP."""
    scope = "auth_signup"


class AuthPasswordResetThrottle(ScopedRateThrottle):
    """3 password reset requests per minute per IP."""
    scope = "auth_password_reset"


# =============================================================================
# Operational Throttles
# =============================================================================


class CheckInThrottle(ScopedRateThrottle):
    """60 check-in events per hour per user."""
    scope = "check_in"


class PhotoUploadThrottle(ScopedRateThrottle):
    """120 photo uploads per hour per user."""
    scope = "photo_upload"


class WebhookDeliveryThrottle(ScopedRateThrottle):
    """1000 webhook deliveries per day per company (keyed on company_id)."""
    scope = "webhook"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"company_{request.user.company_id}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class ManagerDashboardThrottle(ScopedRateThrottle):
    """300 manager dashboard requests per hour per user."""
    scope = "manager_dashboard"


class ApiKeyRateThrottle(SimpleRateThrottle):
    """
    High-volume throttle for Enterprise API Key authenticated requests.
    10 000 requests per day per API key.
    """
    scope = "api_key"

    def get_cache_key(self, request, view):
        api_key = getattr(request, "_api_key_instance", None)
        if api_key:
            ident = f"apikey_{api_key.id}"
        elif request.user and request.user.is_authenticated:
            ident = f"user_{request.user.id}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }
