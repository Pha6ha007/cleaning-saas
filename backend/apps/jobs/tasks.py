# backend/apps/jobs/tasks.py
"""
Celery tasks for apps.jobs.
M005/S02: Recurring CleanProof job generation.
"""
from apps.jobs.recurring_tasks import generate_recurring_jobs  # noqa: F401

__all__ = ["generate_recurring_jobs"]
