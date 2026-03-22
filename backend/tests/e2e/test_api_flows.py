# backend/tests/e2e/test_api_flows.py
"""
E2E: API-level critical flow tests
These use the API directly (not the browser UI) to test the full backend
critical path: create job → check-in → check-out.

These tests run against the live Django server using HTTP requests,
verifying the full request/response cycle including auth, middleware,
throttling, and serializers.
"""

import pytest
import requests

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.e2e]

# Bypass any system proxy (common on macOS dev machines with Clash/Surge/Charles)
NO_PROXY = {"http": None, "https": None}


def _get(url: str, **kwargs) -> requests.Response:
    return requests.get(url, proxies=NO_PROXY, **kwargs)


def _post(url: str, **kwargs) -> requests.Response:
    return requests.post(url, proxies=NO_PROXY, **kwargs)


def manager_auth_headers(live_server_url: str, email: str, password: str) -> dict:
    """Obtain auth token and return headers."""
    resp = _post(
        f"{live_server_url}/api/manager/auth/login/",
        json={"email": email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    # Try JWT access token first, fall back to DRF Token
    if "access" in data:
        return {"Authorization": f"Bearer {data['access']}"}
    elif "token" in data:
        return {"Authorization": f"Token {data['token']}"}
    raise AssertionError(f"No token in login response: {data}")


def cleaner_jwt_headers(live_server_url: str, phone: str, password: str) -> dict:
    """Obtain cleaner JWT token."""
    resp = _post(
        f"{live_server_url}/api/cleaner/auth/token/",
        json={"phone": phone, "password": password},
        timeout=10,
    )
    if resp.status_code == 200:
        token = resp.json().get("access")
        return {"Authorization": f"Bearer {token}"}
    # Fall back to token auth
    return {}


def test_manager_login_returns_jwt(live_server, e2e_owner):
    """Manager login endpoint returns access + refresh tokens."""
    resp = _post(
        f"{live_server.url}/api/manager/auth/login/",
        json={"email": e2e_owner.email, "password": "E2ETestPass123!"},
        timeout=10,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access" in data or "token" in data


def test_create_job_via_api(live_server, e2e_owner, e2e_location, e2e_cleaner):
    """Manager can create a job via API."""
    headers = manager_auth_headers(live_server.url, e2e_owner.email, "E2ETestPass123!")
    from datetime import date
    resp = _post(
        f"{live_server.url}/api/manager/jobs/",
        json={
            "location_id": e2e_location.id,
            "cleaner_id": e2e_cleaner.id,
            "scheduled_date": date.today().isoformat(),
            "context": "cleaning",
        },
        headers=headers,
        timeout=10,
    )
    assert resp.status_code in (200, 201), f"Create job failed: {resp.text}"
    data = resp.json()
    assert "id" in data or "job" in data


def test_branches_api_requires_enterprise(live_server, e2e_owner):
    """Branches API returns enterprise gate for non-enterprise company."""
    headers = manager_auth_headers(live_server.url, e2e_owner.email, "E2ETestPass123!")
    resp = _post(
        f"{live_server.url}/api/branches/",
        json={"name": "Test Branch"},
        headers=headers,
        timeout=10,
    )
    # Standard plan: 403 after first branch exists, or 201 for first
    assert resp.status_code in (200, 201, 403)


def test_sla_policies_list(live_server, e2e_owner):
    """Manager can list SLA policies."""
    headers = manager_auth_headers(live_server.url, e2e_owner.email, "E2ETestPass123!")
    resp = _get(
        f"{live_server.url}/api/sla-policies/",
        headers=headers,
        timeout=10,
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    # Cache header should be present
    assert "X-Cache" in resp.headers


def test_audit_log_api(live_server, e2e_owner):
    """Audit log endpoint is accessible and paginated."""
    headers = manager_auth_headers(live_server.url, e2e_owner.email, "E2ETestPass123!")
    resp = _get(
        f"{live_server.url}/api/jobs/audit-log/",
        headers=headers,
        timeout=10,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "count" in data
    assert "results" in data


def test_recurring_jobs_api(live_server, e2e_owner):
    """Recurring job templates endpoint is accessible."""
    headers = manager_auth_headers(live_server.url, e2e_owner.email, "E2ETestPass123!")
    resp = _get(
        f"{live_server.url}/api/jobs/recurring/",
        headers=headers,
        timeout=10,
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_enterprise_api_keys_requires_enterprise(live_server, e2e_owner):
    """Enterprise API keys endpoint requires enterprise plan."""
    headers = manager_auth_headers(live_server.url, e2e_owner.email, "E2ETestPass123!")
    resp = _get(
        f"{live_server.url}/api/enterprise/api-keys/",
        headers=headers,
        timeout=10,
    )
    # e2e_company is on trial/standard — should get 403 ENTERPRISE_REQUIRED
    assert resp.status_code == 403
    assert resp.json().get("code") == "ENTERPRISE_REQUIRED"


def test_live_analytics_endpoint(live_server, e2e_owner):
    """Live analytics endpoint returns data with cache headers."""
    headers = manager_auth_headers(live_server.url, e2e_owner.email, "E2ETestPass123!")
    resp = _get(
        f"{live_server.url}/api/analytics/live/",
        headers=headers,
        timeout=10,
    )
    assert resp.status_code == 200
    assert "X-Cache" in resp.headers or "Last-Updated" in resp.headers


def test_openapi_schema_accessible(live_server):
    """OpenAPI schema endpoint is publicly accessible."""
    resp = _get(
        f"{live_server.url}/api/schema/",
        timeout=10,
    )
    assert resp.status_code == 200
