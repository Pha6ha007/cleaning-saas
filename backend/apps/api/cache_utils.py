# backend/apps/api/cache_utils.py
"""
M006/S01: API Response Caching utilities

Provides a thin wrapper around Django's cache framework for view-level
response caching with automatic key generation and invalidation helpers.

Usage:
    from apps.api.cache_utils import cached_response, invalidate

    class MyView(APIView):
        def get(self, request):
            key = f"my_resource:{request.user.company_id}"
            data, hit = cached_response(key, ttl=60, fn=lambda: expensive_query())
            resp = Response(data)
            resp["X-Cache"] = "HIT" if hit else "MISS"
            return resp
"""

import logging
from typing import Any, Callable, TypeVar

from django.core.cache import cache

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Sentinel so we can distinguish cache miss from a cached None value
_CACHE_MISS = object()


def cached_response(
    key: str,
    ttl: int,
    fn: Callable[[], T],
) -> tuple[T, bool]:
    """
    Return (value, was_hit) from cache, calling fn() on a miss.

    Args:
        key: Cache key string (should be unique per tenant + params).
        ttl: Time-to-live in seconds.
        fn: Callable that produces the value on cache miss.

    Returns:
        (value, True)  — cache hit
        (value, False) — cache miss (fn() was called)
    """
    cached = cache.get(key, default=_CACHE_MISS)
    if cached is not _CACHE_MISS:
        return cached, True

    value = fn()
    try:
        cache.set(key, value, timeout=ttl)
    except Exception:
        # Never let cache errors break the response
        logger.warning("cache_utils: failed to set key=%s", key, exc_info=True)

    return value, False


def invalidate(*keys: str) -> None:
    """Delete one or more cache keys. Silently ignores errors."""
    for key in keys:
        try:
            cache.delete(key)
        except Exception:
            logger.warning("cache_utils: failed to delete key=%s", key, exc_info=True)


def make_company_key(prefix: str, company_id: int, *parts: Any) -> str:
    """
    Build a namespaced cache key scoped to a company.

    Example:
        make_company_key("sla_policies", 42) → "company:42:sla_policies"
        make_company_key("branch_analytics", 42, 7, 30) → "company:42:branch_analytics:7:30"
    """
    segments = [f"company:{company_id}", prefix] + [str(p) for p in parts]
    return ":".join(segments)
