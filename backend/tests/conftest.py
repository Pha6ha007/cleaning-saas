"""
Pytest fixtures for Proof Platform tests.
Provides common test data: companies, users, locations, jobs.
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from apps.accounts.models import User, Company
from apps.jobs.models import Location, Job


@pytest.fixture
def api_client():
    """DRF API client"""
    return APIClient()


@pytest.fixture
def company():
    """Test company"""
    return Company.objects.create(
        name="Test Cleaning Company",
        contact_email="test@company.com",
        contact_phone="+971501234567",
        is_active=True
    )


@pytest.fixture
def owner_user(company):
    """Owner user with token"""
    user = User.objects.create_user(
        email="owner@test.com",
        password="testpass123!",
        role=User.ROLE_OWNER,
        company=company,
        full_name="Test Owner"
    )
    token = Token.objects.create(user=user)
    user.token = token.key
    return user


@pytest.fixture
def manager_user(company):
    """Manager user with token"""
    user = User.objects.create_user(
        email="manager@test.com",
        password="testpass123!",
        role=User.ROLE_MANAGER,
        company=company,
        full_name="Test Manager"
    )
    token = Token.objects.create(user=user)
    user.token = token.key
    return user


@pytest.fixture
def staff_user(company):
    """Staff user (cleaner) with token"""
    user = User.objects.create_user(
        phone="+971501111111",
        password="testpass123!",
        role=User.ROLE_CLEANER,  # Fixed: CLEANER role required for check-in/check-out
        company=company,
        full_name="Test Cleaner"
    )
    token = Token.objects.create(user=user)
    user.token = token.key
    return user


@pytest.fixture
def location(company):
    """Test location"""
    return Location.objects.create(
        name="Dubai Marina Tower",
        company=company,
        address="Dubai Marina, Dubai",
        latitude=25.0808,
        longitude=55.1408
    )


@pytest.fixture
def scheduled_job(company, location, staff_user):
    """Scheduled cleaning job"""
    from datetime import time
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=staff_user,
        status=Job.STATUS_SCHEDULED,
        context=Job.CONTEXT_CLEANING,
        scheduled_date=(timezone.now() + timedelta(hours=1)).date(),
        scheduled_start_time=time(9, 0),  # 9:00 AM
        scheduled_end_time=time(11, 0)    # 11:00 AM (2 hours)
    )


@pytest.fixture
def in_progress_job(company, location, staff_user):
    """Job in progress"""
    from datetime import time
    job = Job.objects.create(
        company=company,
        location=location,
        cleaner=staff_user,
        status=Job.STATUS_IN_PROGRESS,
        context=Job.CONTEXT_CLEANING,
        scheduled_date=timezone.now().date(),
        scheduled_start_time=time(9, 0),   # 9:00 AM
        scheduled_end_time=time(11, 0),    # 11:00 AM
        actual_start_time=timezone.now() - timedelta(minutes=30)
    )
    return job


@pytest.fixture
def completed_job(company, location, staff_user):
    """Completed job"""
    from datetime import time
    start = timezone.now() - timedelta(hours=3)
    end = timezone.now() - timedelta(hours=1)

    job = Job.objects.create(
        company=company,
        location=location,
        cleaner=staff_user,
        status=Job.STATUS_COMPLETED,
        context=Job.CONTEXT_CLEANING,
        scheduled_date=start.date(),
        scheduled_start_time=time(9, 0),   # 9:00 AM
        scheduled_end_time=time(11, 0),    # 11:00 AM
        actual_start_time=start,
        actual_end_time=end
    )
    return job
