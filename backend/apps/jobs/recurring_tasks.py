# backend/apps/jobs/recurring_tasks.py
"""
M005/S02: Celery task for auto-generating recurring CleanProof jobs.

Runs daily (registered in Celery Beat). For each active RecurringJobTemplate
in the system, checks if today matches the template's schedule and generates
a Job if it hasn't already been generated today.

Idempotent: skips templates where last_generated_at == today.
"""

import logging
from datetime import date

from celery import shared_task
from django.db import transaction

from apps.jobs.models import RecurringJobTemplate

logger = logging.getLogger(__name__)


@shared_task(bind=True, name="apps.jobs.generate_recurring_jobs")
def generate_recurring_jobs(self, target_date_iso: str | None = None):
    """
    Generate jobs for all active recurring templates.

    Args:
        target_date_iso: ISO date string (YYYY-MM-DD) to generate for.
                         Defaults to today. Accepts override for testing.

    Returns:
        dict with counts: generated, skipped, errors
    """
    if target_date_iso:
        try:
            from datetime import date as dt_date
            target_date = dt_date.fromisoformat(target_date_iso)
        except ValueError:
            logger.error("generate_recurring_jobs: invalid date %s", target_date_iso)
            return {"generated": 0, "skipped": 0, "errors": 1}
    else:
        target_date = date.today()

    logger.info("generate_recurring_jobs: running for %s", target_date)

    templates = RecurringJobTemplate.objects.filter(
        is_active=True,
    ).select_related("company", "location", "cleaner", "checklist_template")

    generated = 0
    skipped = 0
    errors = 0

    for template in templates:
        # Skip if already generated today (idempotent)
        if template.last_generated_at == target_date:
            skipped += 1
            continue

        # Check schedule
        if not template.should_run_on(target_date):
            skipped += 1
            continue

        try:
            with transaction.atomic():
                template.generate_job_for_date(target_date)
                generated += 1
                logger.info(
                    "generate_recurring_jobs: created job for template %d (%s) on %s",
                    template.id, template.name, target_date,
                )
        except Exception as exc:
            errors += 1
            logger.error(
                "generate_recurring_jobs: failed for template %d (%s): %s",
                template.id, template.name, exc,
            )

    logger.info(
        "generate_recurring_jobs done: generated=%d skipped=%d errors=%d",
        generated, skipped, errors,
    )
    return {"generated": generated, "skipped": skipped, "errors": errors}
