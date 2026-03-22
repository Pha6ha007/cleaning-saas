# backend/tests/conftest.py
"""
Global test configuration and shared fixtures.
"""
import pytest


@pytest.fixture(autouse=True)
def clear_django_cache():
    """
    Clear the Django cache before every test.
    Prevents cache pollution between tests — particularly important when
    caching views (analytics, SLA policies) are tested alongside tests
    that make live DB queries expecting fresh counts.
    """
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()
