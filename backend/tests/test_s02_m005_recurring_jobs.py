# backend/tests/test_s02_m005_recurring_jobs.py
"""
M005/S02: Recurring CleanProof Job Scheduling — Contract Tests

Proves:
1. RecurringJobTemplate model exists with correct fields
2. should_run_on: DAILY always returns True
3. should_run_on: WEEKLY matches correct day_of_week
4. should_run_on: WEEKLY misses wrong day_of_week
5. should_run_on: MONTHLY matches correct day_of_month
6. should_run_on: MONTHLY misses wrong day_of_month
7. should_run_on: returns False when is_active=False
8. generate_job_for_date creates a Job with correct fields
9. generate_job_for_date sets last_generated_at
10. generate_job_for_date copies checklist items
11. Celery task: generate_recurring_jobs generates job for matching template
12. Celery task: skips inactive templates
13. Celery task: skips already-generated-today templates (idempotent)
14. Celery task: skips non-matching schedule days
15. GET /api/jobs/recurring/ requires auth
16. GET /api/jobs/recurring/ returns empty list
17. POST /api/jobs/recurring/ creates template
18. POST /api/jobs/recurring/ returns 400 for missing name
19. POST /api/jobs/recurring/ returns 400 for invalid frequency
20. GET /api/jobs/recurring/<id>/ returns detail
21. PATCH /api/jobs/recurring/<id>/ pause (is_active=False)
22. PATCH /api/jobs/recurring/<id>/ resume (is_active=True)
23. PATCH /api/jobs/recurring/<id>/ returns 400 for invalid day_of_week
24. DELETE /api/jobs/recurring/<id>/ removes template
"""

import pytest
from datetime import date
from rest_framework.test import APIClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Recurring Test Co", plan="active")


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="owner@recurtest.com", full_name="Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="cleaner@recurtest.com", full_name="Cleaner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def location(company, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company, name="Recur Location")


@pytest.fixture
def auth_client(owner):
    c = APIClient()
    c.force_authenticate(user=owner)
    return c


@pytest.fixture
def template(company, location, cleaner, db):
    from apps.jobs.models import RecurringJobTemplate
    return RecurringJobTemplate.objects.create(
        company=company,
        location=location,
        cleaner=cleaner,
        name="Daily Cleaning",
        frequency=RecurringJobTemplate.FREQUENCY_DAILY,
    )


# =============================================================================
# Model Tests: should_run_on
# =============================================================================

@pytest.mark.django_db
class TestShouldRunOn:
    def test_daily_always_runs(self, template):
        from apps.jobs.models import RecurringJobTemplate
        template.frequency = RecurringJobTemplate.FREQUENCY_DAILY
        assert template.should_run_on(date(2026, 3, 16)) is True
        assert template.should_run_on(date(2026, 3, 17)) is True
        assert template.should_run_on(date(2026, 3, 18)) is True

    def test_weekly_runs_on_correct_day(self, template):
        from apps.jobs.models import RecurringJobTemplate
        template.frequency = RecurringJobTemplate.FREQUENCY_WEEKLY
        template.day_of_week = 0  # Monday
        monday = date(2026, 3, 16)  # This is a Monday
        assert monday.weekday() == 0
        assert template.should_run_on(monday) is True

    def test_weekly_skips_wrong_day(self, template):
        from apps.jobs.models import RecurringJobTemplate
        template.frequency = RecurringJobTemplate.FREQUENCY_WEEKLY
        template.day_of_week = 0  # Monday
        tuesday = date(2026, 3, 17)
        assert tuesday.weekday() == 1
        assert template.should_run_on(tuesday) is False

    def test_monthly_runs_on_correct_day(self, template):
        from apps.jobs.models import RecurringJobTemplate
        template.frequency = RecurringJobTemplate.FREQUENCY_MONTHLY
        template.day_of_month = 15
        assert template.should_run_on(date(2026, 3, 15)) is True
        assert template.should_run_on(date(2026, 4, 15)) is True

    def test_monthly_skips_wrong_day(self, template):
        from apps.jobs.models import RecurringJobTemplate
        template.frequency = RecurringJobTemplate.FREQUENCY_MONTHLY
        template.day_of_month = 15
        assert template.should_run_on(date(2026, 3, 14)) is False
        assert template.should_run_on(date(2026, 3, 16)) is False

    def test_inactive_template_never_runs(self, template):
        template.is_active = False
        assert template.should_run_on(date.today()) is False

    def test_weekly_no_day_set_never_runs(self, template):
        from apps.jobs.models import RecurringJobTemplate
        template.frequency = RecurringJobTemplate.FREQUENCY_WEEKLY
        template.day_of_week = None
        assert template.should_run_on(date.today()) is False


# =============================================================================
# Model Tests: generate_job_for_date
# =============================================================================

@pytest.mark.django_db
class TestGenerateJobForDate:
    def test_creates_job(self, template):
        from apps.jobs.models import Job
        target = date(2026, 6, 1)
        job = template.generate_job_for_date(target)
        assert job.pk is not None
        assert job.scheduled_date == target
        assert job.status == Job.STATUS_SCHEDULED
        assert job.context == Job.CONTEXT_CLEANING

    def test_job_has_correct_company_location(self, template):
        job = template.generate_job_for_date(date(2026, 6, 1))
        assert job.company_id == template.company_id
        assert job.location_id == template.location_id

    def test_sets_last_generated_at(self, template):
        target = date(2026, 6, 1)
        template.generate_job_for_date(target)
        template.refresh_from_db()
        assert template.last_generated_at == target

    def test_job_notes_mention_template_name(self, template):
        job = template.generate_job_for_date(date(2026, 6, 1))
        assert template.name in job.manager_notes

    def test_checklist_items_copied(self, company, location, cleaner, db):
        from apps.jobs.models import RecurringJobTemplate
        from apps.locations.models import ChecklistTemplate, ChecklistTemplateItem
        ct = ChecklistTemplate.objects.create(
            company=company, name="Test Checklist", context="cleaning"
        )
        ChecklistTemplateItem.objects.create(template=ct, text="Mop floor", order=1)
        ChecklistTemplateItem.objects.create(template=ct, text="Empty bins", order=2)
        t = RecurringJobTemplate.objects.create(
            company=company, location=location, cleaner=cleaner,
            name="CT Test", frequency=RecurringJobTemplate.FREQUENCY_DAILY,
            checklist_template=ct,
        )
        job = t.generate_job_for_date(date(2026, 6, 1))
        items = job.checklist_items.all()
        assert items.count() == 2
        texts = {i.text for i in items}
        assert "Mop floor" in texts
        assert "Empty bins" in texts


# =============================================================================
# Celery Task Tests
# =============================================================================

def _run_task(target_date_iso=None):
    """Invoke generate_recurring_jobs synchronously, bypassing Celery broker."""
    from apps.jobs.recurring_tasks import generate_recurring_jobs
    return generate_recurring_jobs.run(target_date_iso=target_date_iso)


@pytest.mark.django_db
class TestGenerateRecurringJobsTask:
    def test_task_generates_job_for_daily_template(self, template):
        from apps.jobs.models import Job
        target = date(2026, 6, 2)
        result = _run_task(target_date_iso=target.isoformat())
        assert result["generated"] == 1
        assert result["skipped"] == 0
        assert result["errors"] == 0
        assert Job.objects.filter(
            company=template.company, scheduled_date=target
        ).count() == 1

    def test_task_skips_inactive_template(self, template):
        template.is_active = False
        template.save(update_fields=["is_active"])
        result = _run_task(target_date_iso="2026-06-03")
        # Inactive templates are filtered out at the queryset level — not counted as generated or error
        assert result["generated"] == 0
        assert result["errors"] == 0

    def test_task_is_idempotent(self, template):
        target = date(2026, 6, 4)
        _run_task(target_date_iso=target.isoformat())
        result = _run_task(target_date_iso=target.isoformat())
        assert result["generated"] == 0
        assert result["skipped"] == 1

    def test_task_skips_wrong_day_for_weekly(self, template):
        from apps.jobs.models import RecurringJobTemplate
        template.frequency = RecurringJobTemplate.FREQUENCY_WEEKLY
        template.day_of_week = 0  # Monday
        template.save(update_fields=["frequency", "day_of_week"])
        tuesday = date(2026, 3, 17)  # Tuesday
        result = _run_task(target_date_iso=tuesday.isoformat())
        assert result["generated"] == 0
        assert result["skipped"] == 1

    def test_task_invalid_date_returns_error(self):
        result = _run_task(target_date_iso="not-a-date")
        assert result["errors"] == 1


# =============================================================================
# API Tests
# =============================================================================

@pytest.mark.django_db
class TestRecurringJobAPI:
    URL = "/api/jobs/recurring/"

    def test_unauthenticated_returns_401(self):
        resp = APIClient().get(self.URL)
        assert resp.status_code == 401

    def test_list_empty(self, auth_client):
        resp = auth_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_template(self, auth_client, location, cleaner):
        resp = auth_client.post(self.URL, {
            "name": "Evening Round",
            "frequency": "daily",
            "location_id": location.id,
            "cleaner_id": cleaner.id,
        }, format="json")
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Evening Round"
        assert data["frequency"] == "daily"
        assert data["is_active"] is True

    def test_create_missing_name_returns_400(self, auth_client, location):
        resp = auth_client.post(self.URL, {
            "frequency": "daily",
            "location_id": location.id,
        }, format="json")
        assert resp.status_code == 400
        assert "name" in resp.json()["fields"]

    def test_create_invalid_frequency_returns_400(self, auth_client, location):
        resp = auth_client.post(self.URL, {
            "name": "Bad",
            "frequency": "hourly",
            "location_id": location.id,
        }, format="json")
        assert resp.status_code == 400
        assert "frequency" in resp.json()["fields"]

    def test_create_missing_location_returns_400(self, auth_client):
        resp = auth_client.post(self.URL, {
            "name": "No Location",
            "frequency": "daily",
        }, format="json")
        assert resp.status_code == 400

    def test_get_detail(self, auth_client, template):
        resp = auth_client.get(f"{self.URL}{template.id}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == template.name

    def test_get_other_company_returns_404(self, auth_client, db):
        from apps.accounts.models import Company, User
        from apps.locations.models import Location
        from apps.jobs.models import RecurringJobTemplate
        other_co = Company.objects.create(name="Other", plan="active")
        other_loc = Location.objects.create(company=other_co, name="Other Loc")
        other_cleaner = User.objects.create(
            company=other_co, role=User.ROLE_CLEANER,
            email="oc@test.com", full_name="OC", is_active=True,
        )
        t = RecurringJobTemplate.objects.create(
            company=other_co, location=other_loc, cleaner=other_cleaner,
            name="Foreign", frequency=RecurringJobTemplate.FREQUENCY_DAILY,
        )
        resp = auth_client.get(f"{self.URL}{t.id}/")
        assert resp.status_code == 404

    def test_patch_pause(self, auth_client, template):
        resp = auth_client.patch(f"{self.URL}{template.id}/", {"is_active": False}, format="json")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_patch_resume(self, auth_client, template):
        template.is_active = False
        template.save(update_fields=["is_active"])
        resp = auth_client.patch(f"{self.URL}{template.id}/", {"is_active": True}, format="json")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is True

    def test_patch_invalid_day_of_week_returns_400(self, auth_client, template):
        resp = auth_client.patch(f"{self.URL}{template.id}/", {"day_of_week": 9}, format="json")
        assert resp.status_code == 400

    def test_delete_template(self, auth_client, template):
        resp = auth_client.delete(f"{self.URL}{template.id}/")
        assert resp.status_code == 204

    def test_list_shows_all_templates(self, auth_client, template, location, cleaner):
        from apps.jobs.models import RecurringJobTemplate
        RecurringJobTemplate.objects.create(
            company=template.company, location=location, cleaner=cleaner,
            name="Second", frequency=RecurringJobTemplate.FREQUENCY_WEEKLY, day_of_week=1,
        )
        resp = auth_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.json()) == 2
