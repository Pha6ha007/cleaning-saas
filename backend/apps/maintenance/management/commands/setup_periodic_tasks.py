"""
Management command: setup_periodic_tasks

Creates (or updates) Celery Beat DB-backed periodic tasks.
Replaces the hardcoded beat_schedule in config/celery.py.

Run on every deploy:
    python manage.py setup_periodic_tasks

Idempotent — safe to re-run. Uses update_or_create so existing tasks
are updated in-place without creating duplicates.

Tasks created:
- generate-recurring-visits-daily  → apps.maintenance.tasks.generate_recurring_visits
  Cron: daily at 06:00 Asia/Dubai
- check-sla-warnings-hourly        → apps.maintenance.tasks.check_sla_warnings
  Cron: every hour at :00

See: docs/deployment/JWT_PADDLE_SUPPLEMENT.md
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json


class Command(BaseCommand):
    help = "Create or update Celery Beat periodic tasks in the database (idempotent)."

    TASKS = [
        {
            "name": "generate-recurring-visits-daily",
            "task": "apps.maintenance.tasks.generate_recurring_visits",
            "description": "Daily generation of visits from recurring templates (06:00 Dubai time)",
            "crontab": {
                "minute": "0",
                "hour": "6",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
                "timezone": "Asia/Dubai",
            },
        },
        {
            "name": "check-sla-warnings-hourly",
            "task": "apps.maintenance.tasks.check_sla_warnings",
            "description": "Hourly SLA deadline check and warning notifications",
            "crontab": {
                "minute": "0",
                "hour": "*",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
                "timezone": "Asia/Dubai",
            },
        },
        {
            "name": "generate-recurring-cleaning-jobs-daily",
            "task": "apps.jobs.generate_recurring_jobs",
            "description": "M005/S02: Daily generation of CleanProof jobs from recurring templates (05:00 Dubai time)",
            "crontab": {
                "minute": "0",
                "hour": "5",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
                "timezone": "Asia/Dubai",
            },
        },
        {
            "name": "check-trial-expiry-reminders-daily",
            "task": "apps.emails.tasks.check_trial_expiry_reminders",
            "description": "Daily check for trial expiry: sends 3-day, 1-day, and expired reminders (08:00 Dubai time)",
            "crontab": {
                "minute": "0",
                "hour": "8",
                "day_of_week": "*",
                "day_of_month": "*",
                "month_of_year": "*",
                "timezone": "Asia/Dubai",
            },
        },
    ]

    def handle(self, *args, **options):
        verbosity = options.get("verbosity", 1)
        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for task_def in self.TASKS:
                crontab_params = task_def["crontab"]

                schedule, schedule_created = CrontabSchedule.objects.get_or_create(
                    minute=crontab_params["minute"],
                    hour=crontab_params["hour"],
                    day_of_week=crontab_params["day_of_week"],
                    day_of_month=crontab_params["day_of_month"],
                    month_of_year=crontab_params["month_of_year"],
                    timezone=crontab_params["timezone"],
                )

                periodic_task, task_created = PeriodicTask.objects.update_or_create(
                    name=task_def["name"],
                    defaults={
                        "task": task_def["task"],
                        "crontab": schedule,
                        "enabled": True,
                        "description": task_def["description"],
                        "kwargs": json.dumps({}),
                    },
                )

                if task_created:
                    created_count += 1
                    if verbosity >= 1:
                        self.stdout.write(
                            self.style.SUCCESS(f"  ✓ Created: {task_def['name']}")
                        )
                else:
                    updated_count += 1
                    if verbosity >= 1:
                        self.stdout.write(
                            self.style.WARNING(f"  ↺ Updated: {task_def['name']}")
                        )

        if verbosity >= 1:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDone — {created_count} created, {updated_count} updated."
                )
            )
