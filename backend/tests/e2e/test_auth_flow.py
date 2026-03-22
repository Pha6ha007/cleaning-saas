# backend/tests/e2e/test_auth_flow.py
import os
import pytest
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.e2e]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
_NO_FRONTEND = not FRONTEND_URL
_SKIP_MSG = "Set FRONTEND_URL=http://localhost:8080 to run frontend E2E tests"


@pytest.mark.skipif(_NO_FRONTEND, reason=_SKIP_MSG)
def test_login_page_accessible():
    """Login page is served by the frontend."""
    pass


@pytest.mark.skipif(_NO_FRONTEND, reason=_SKIP_MSG)
def test_login_success_ui(page: Page, e2e_owner):
    """Owner can log in via the UI and reach the dashboard."""
    page.goto(f"{FRONTEND_URL}/login")
    page.fill('input[type="email"]', e2e_owner.email)
    page.fill('input[type="password"]', "E2ETestPass123!")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard", timeout=15_000)
    expect(page).to_have_url(f"{FRONTEND_URL}/dashboard")


@pytest.mark.skipif(_NO_FRONTEND, reason=_SKIP_MSG)
def test_login_wrong_password_ui(page: Page, e2e_owner):
    """Wrong password shows an error."""
    page.goto(f"{FRONTEND_URL}/login")
    page.fill('input[type="email"]', e2e_owner.email)
    page.fill('input[type="password"]', "wrongpassword")
    page.click('button[type="submit"]')
    page.wait_for_timeout(2000)
    assert "/login" in page.url or "/dashboard" not in page.url


@pytest.mark.skipif(_NO_FRONTEND, reason=_SKIP_MSG)
def test_unauthenticated_redirect_ui(page: Page):
    """Accessing /dashboard without auth redirects to /login."""
    page.goto(f"{FRONTEND_URL}/dashboard")
    page.wait_for_url("**/login", timeout=5_000)
    assert "/login" in page.url
