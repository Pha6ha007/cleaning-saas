# backend/tests/test_s01_m007_health.py
"""
S01 M007: Health endpoint tests

Tests for:
- GET /api/health/        → liveness probe (always 200)
- GET /api/health/ready/  → readiness probe (DB + cache checks)
"""

import pytest
from django.test import TestCase, Client


@pytest.mark.django_db
class TestLivenessProbe:
    """GET /api/health/ — lightweight liveness check."""

    def test_liveness_returns_200(self, client):
        resp = client.get("/api/health/")
        assert resp.status_code == 200

    def test_liveness_returns_json(self, client):
        resp = client.get("/api/health/")
        data = resp.json()
        assert data["status"] == "ok"

    def test_liveness_requires_no_auth(self, client):
        """No token or session needed."""
        resp = client.get("/api/health/")
        assert resp.status_code == 200

    def test_liveness_allows_get_only(self, client):
        """POST should 405."""
        resp = client.post("/api/health/", {})
        assert resp.status_code == 405

    def test_liveness_has_no_db_check(self, client):
        """
        Liveness payload is minimal — no 'database' key.
        DB check belongs in readiness only.
        """
        resp = client.get("/api/health/")
        data = resp.json()
        assert "database" not in data


@pytest.mark.django_db
class TestReadinessProbe:
    """GET /api/health/ready/ — full readiness check."""

    def test_readiness_returns_200_when_healthy(self, client):
        resp = client.get("/api/health/ready/")
        assert resp.status_code == 200

    def test_readiness_payload_structure(self, client):
        resp = client.get("/api/health/ready/")
        data = resp.json()
        assert data["status"] in ("ok", "degraded")
        assert "checks" in data
        assert "database" in data["checks"]
        assert "cache" in data["checks"]

    def test_readiness_database_ok(self, client):
        resp = client.get("/api/health/ready/")
        data = resp.json()
        assert data["checks"]["database"] == "ok"

    def test_readiness_cache_ok(self, client):
        resp = client.get("/api/health/ready/")
        data = resp.json()
        assert data["checks"]["cache"] == "ok"

    def test_readiness_includes_django_version(self, client):
        resp = client.get("/api/health/ready/")
        data = resp.json()
        assert "django_version" in data
        major, minor = data["django_version"]
        assert major >= 4

    def test_readiness_requires_no_auth(self, client):
        resp = client.get("/api/health/ready/")
        assert resp.status_code in (200, 503)  # either is valid, but not 401/403
        assert resp.status_code not in (401, 403)

    def test_readiness_status_ok_string_when_healthy(self, client):
        resp = client.get("/api/health/ready/")
        data = resp.json()
        assert data["status"] == "ok"


@pytest.mark.django_db
class TestHealthEndpointDegradation:
    """Test that readiness returns 503 when a check fails."""

    def test_readiness_503_on_cache_failure(self, client, monkeypatch):
        """Simulate cache write failure → readiness should return 503."""
        from django.core.cache import cache

        original_set = cache.set

        def broken_set(*args, **kwargs):
            raise Exception("Redis connection refused")

        monkeypatch.setattr(cache, "set", broken_set)
        resp = client.get("/api/health/ready/")
        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "degraded"
        assert "error" in data["checks"]["cache"]
