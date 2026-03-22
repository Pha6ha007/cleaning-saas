# backend/tests/e2e/conftest.py
"""
E2E test configuration for pytest-playwright.

Uses pytest-django's live_server fixture to spin up Django on a random port.
Playwright then connects to that URL.

Usage:
    pytest tests/e2e/ --live-server-url=auto
    # or just: pytest tests/e2e/

Each test gets a fresh browser page. The Django live_server handles DB setup
via the standard pytest-django transaction/db fixtures.
"""

import pytest
from django.contrib.auth import get_user_model
from playwright.sync_api import Page, expect


# ---------------------------------------------------------------------------
# Seeding helpers (create test data directly via ORM — no API calls needed)
# ---------------------------------------------------------------------------

@pytest.fixture
def e2e_company(db):
    """An active company for E2E tests."""
    from apps.accounts.models import Company
    return Company.objects.create(
        name="E2E Test Company",
        plan="trial",
        plan_tier="standard",
    )


@pytest.fixture
def e2e_owner(e2e_company, db):
    """An owner user for E2E tests."""
    from apps.accounts.models import User
    u = User.objects.create(
        company=e2e_company,
        role=User.ROLE_OWNER,
        email="e2e_owner@proofplatform.test",
        full_name="E2E Owner",
        is_active=True,
    )
    u.set_password("E2ETestPass123!")
    u.save()
    return u


@pytest.fixture
def e2e_cleaner(e2e_company, db):
    """A cleaner user for E2E tests."""
    from apps.accounts.models import User
    u = User.objects.create(
        company=e2e_company,
        role=User.ROLE_CLEANER,
        email="e2e_cleaner@proofplatform.test",
        full_name="E2E Cleaner",
        is_active=True,
    )
    u.set_password("CleanerPass123!")
    u.save()
    return u


@pytest.fixture
def e2e_location(e2e_company, db):
    """A location for E2E tests."""
    from apps.locations.models import Location
    return Location.objects.create(
        company=e2e_company,
        name="E2E Test Location",
        address="123 Test Street",
        is_active=True,
    )


@pytest.fixture
def e2e_job(e2e_company, e2e_location, e2e_cleaner, db):
    """A scheduled job for E2E tests."""
    from apps.jobs.models import Job
    from datetime import date
    return Job.objects.create(
        company=e2e_company,
        location=e2e_location,
        cleaner=e2e_cleaner,
        status=Job.STATUS_SCHEDULED,
        context=Job.CONTEXT_CLEANING,
        scheduled_date=date.today(),
    )


@pytest.fixture
def api_token(e2e_owner):
    """DRF token for the E2E owner."""
    from rest_framework.authtoken.models import Token
    token, _ = Token.objects.get_or_create(user=e2e_owner)
    return token.key


# ---------------------------------------------------------------------------
# Login helper
# ---------------------------------------------------------------------------

def login_as_owner(page: Page, live_server_url: str, owner) -> None:
    """Navigate to login page and authenticate as the given owner."""
    page.goto(f"{live_server_url}/login")
    page.fill('input[type="email"], input[name="email"]', owner.email)
    page.fill('input[type="password"], input[name="password"]', "E2ETestPass123!")
    page.click('button[type="submit"]')
    # Wait for redirect to dashboard
    page.wait_for_url("**/dashboard", timeout=10_000)
