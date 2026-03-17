# backend/tests/test_s04_m002_celery_beat.py
"""
M002/S04: Celery Beat DB-backed Schedules — Contract Tests

Proves:
1. setup_periodic_tasks command creates expected PeriodicTask records
2. Tasks are created with correct crontab schedules (06:00 Dubai / hourly)
3. Command is idempotent — running twice doesn't create duplicates
4. Updated tasks reflect new schedule after re-run
5. Both tasks are enabled by default
6. Hardcoded beat_schedule has been removed from celery.py
7. CELERY_BEAT_SCHEDULER is set to DatabaseScheduler
"""

import pytest
import json
from django.core.management import call_command
from io import StringIO


@pytest.mark.django_db
class TestSetupPeriodicTasksCommand:
    """Management command creates DB-backed periodic tasks."""

    def test_command_creates_both_tasks(self):
        from django_celery_beat.models import PeriodicTask
        out = StringIO()
        call_command("setup_periodic_tasks", stdout=out, verbosity=1)
        task_names = list(PeriodicTask.objects.values_list("name", flat=True))
        assert "generate-recurring-visits-daily" in task_names
        assert "check-sla-warnings-hourly" in task_names

    def test_generate_visits_task_properties(self):
        from django_celery_beat.models import PeriodicTask
        call_command("setup_periodic_tasks", stdout=StringIO(), verbosity=0)
        task = PeriodicTask.objects.get(name="generate-recurring-visits-daily")
        assert task.task == "apps.maintenance.tasks.generate_recurring_visits"
        assert task.enabled is True
        assert task.crontab is not None
        assert task.crontab.hour == "6"
        assert task.crontab.minute == "0"
        assert str(task.crontab.timezone) == "Asia/Dubai"

    def test_sla_warnings_task_properties(self):
        from django_celery_beat.models import PeriodicTask
        call_command("setup_periodic_tasks", stdout=StringIO(), verbosity=0)
        task = PeriodicTask.objects.get(name="check-sla-warnings-hourly")
        assert task.task == "apps.maintenance.tasks.check_sla_warnings"
        assert task.enabled is True
        assert task.crontab is not None
        assert task.crontab.hour == "*"
        assert task.crontab.minute == "0"
        assert str(task.crontab.timezone) == "Asia/Dubai"

    def test_command_is_idempotent(self):
        from django_celery_beat.models import PeriodicTask
        call_command("setup_periodic_tasks", stdout=StringIO(), verbosity=0)
        call_command("setup_periodic_tasks", stdout=StringIO(), verbosity=0)
        # Exactly 2 tasks (no duplicates)
        count = PeriodicTask.objects.filter(
            name__in=["generate-recurring-visits-daily", "check-sla-warnings-hourly"]
        ).count()
        assert count == 2

    def test_command_output_shows_created(self):
        out = StringIO()
        call_command("setup_periodic_tasks", stdout=out, verbosity=1)
        output = out.getvalue()
        assert "generate-recurring-visits-daily" in output
        assert "check-sla-warnings-hourly" in output

    def test_command_output_shows_updated_on_second_run(self):
        call_command("setup_periodic_tasks", stdout=StringIO(), verbosity=0)
        out = StringIO()
        call_command("setup_periodic_tasks", stdout=out, verbosity=1)
        output = out.getvalue()
        # Second run should show "Updated" not "Created"
        assert "Updated" in output or "↺" in output

    def test_tasks_have_description(self):
        from django_celery_beat.models import PeriodicTask
        call_command("setup_periodic_tasks", stdout=StringIO(), verbosity=0)
        for name in ["generate-recurring-visits-daily", "check-sla-warnings-hourly"]:
            task = PeriodicTask.objects.get(name=name)
            assert task.description, f"Task '{name}' missing description"


@pytest.mark.django_db
class TestCeleryBeatSettings:
    """Settings are correctly configured for DB-backed beat."""

    def test_beat_scheduler_is_database_scheduler(self):
        from django.conf import settings
        assert settings.CELERY_BEAT_SCHEDULER == "django_celery_beat.schedulers:DatabaseScheduler"

    def test_django_celery_beat_in_installed_apps(self):
        from django.conf import settings
        assert "django_celery_beat" in settings.INSTALLED_APPS

    def test_celery_timezone_is_set(self):
        from django.conf import settings
        assert hasattr(settings, "CELERY_TIMEZONE")
        assert settings.CELERY_TIMEZONE  # non-empty


class TestCeleryConfigHardcodedScheduleRemoved:
    """Hardcoded beat_schedule has been removed from celery.py."""

    def test_no_hardcoded_beat_schedule(self):
        """celery.py should not contain a hardcoded beat_schedule dict."""
        import inspect
        import config.celery as celery_module
        source = inspect.getsource(celery_module)
        # The beat_schedule assignment should be gone
        assert "app.conf.beat_schedule = {" not in source, (
            "Hardcoded beat_schedule still present in config/celery.py — "
            "should be managed via setup_periodic_tasks command instead"
        )

    def test_celery_app_importable(self):
        """celery.py imports cleanly after removing beat_schedule."""
        import config.celery
        assert config.celery.app is not None

    def test_database_scheduler_comment_present(self):
        """celery.py has a comment pointing to setup_periodic_tasks."""
        import inspect
        import config.celery as celery_module
        source = inspect.getsource(celery_module)
        assert "setup_periodic_tasks" in source
