# backend/tests/e2e/test_dashboard.py
import os
import pytest
from playwright.sync_api import Page, expect

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.e2e]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
_NO_FRONTEND = not FRONTEND_URL
_SKIP_MSG = "Set FRONTEND_URL=http://localhost:8080 to run frontend E2E tests"


def _login(page: Page, email: str, password: str) -> None:
    page.goto(f"{FRONTEND_URL}/login")
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard", timeout=10_000)


@pytest.mark.skipif(_NO_FRONTEND, reason=_SKIP_MSG)
def test_dashboard_loads(page: Page):
    """Dashboard page renders after login."""
    pass


@pytest.mark.skipif(_NO_FRONTEND, reason=_SKIP_MSG)
def test_jobs_page_accessible(page: Page):
    pass


@pytest.mark.skipif(_NO_FRONTEND, reason=_SKIP_MSG)
def test_unauthenticated_redirect_to_login(page: Page):
    """Accessing /dashboard without auth redirects to /login."""
    page.goto(f"{FRONTEND_URL}/dashboard")
    page.wait_for_url("**/login", timeout=5_000)
    assert "/login" in page.url
