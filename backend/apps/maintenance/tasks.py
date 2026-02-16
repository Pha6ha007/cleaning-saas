"""
Maintenance Celery Tasks (Stage 14: Automated Visit Generation)

Periodic tasks for automated maintenance operations:
- generate_recurring_visits: Daily generation of visits from templates
- check_sla_warnings: Hourly check for SLA violations

See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 14)
"""

import logging
from datetime import date, timedelta
from celery import shared_task
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_recurring_visits(self, lookahead_days: int = 30):
    """
    Generate visits from all active recurring templates.

    Runs daily at 6:00 AM (configured in config/celery.py).
    Generates visits up to `lookahead_days` into the future.

    Args:
        lookahead_days: How many days ahead to generate visits (default 30)

    Returns:
        dict with generation statistics
    """
    from apps.maintenance.models import RecurringVisitTemplate, GeneratedVisitLog
    from apps.jobs.models import Job, JobChecklistItem

    logger.info(f"Starting automated visit generation (lookahead: {lookahead_days} days)")

    today = timezone.now().date()
    date_to = today + timedelta(days=lookahead_days)

    stats = {
        "templates_processed": 0,
        "visits_created": 0,
        "templates_skipped": 0,
        "errors": [],
    }

    # Get all active templates
    templates = RecurringVisitTemplate.objects.filter(
        is_active=True
    ).select_related(
        "company", "asset", "location", "checklist_template",
        "maintenance_category", "assigned_technician"
    )

    for template in templates:
        try:
            created_count = _generate_visits_for_template(
                template=template,
                date_from=today,
                date_to=date_to,
            )
            stats["templates_processed"] += 1
            stats["visits_created"] += created_count

            if created_count > 0:
                logger.info(
                    f"Template '{template.name}' (ID={template.id}): "
                    f"created {created_count} visits"
                )
        except Exception as e:
            stats["templates_skipped"] += 1
            stats["errors"].append({
                "template_id": template.id,
                "template_name": template.name,
                "error": str(e),
            })
            logger.error(
                f"Error generating visits for template '{template.name}' "
                f"(ID={template.id}): {e}"
            )

    logger.info(
        f"Visit generation complete: "
        f"{stats['templates_processed']} templates processed, "
        f"{stats['visits_created']} visits created, "
        f"{stats['templates_skipped']} skipped"
    )

    return stats


def _generate_visits_for_template(
    template,
    date_from: date,
    date_to: date,
) -> int:
    """
    Generate visits for a single template within date range.

    Reuses logic from GenerateVisitsView but without user context.

    Args:
        template: RecurringVisitTemplate instance
        date_from: Start of generation range
        date_to: End of generation range

    Returns:
        Number of visits created
    """
    from apps.maintenance.models import GeneratedVisitLog
    from apps.jobs.models import Job, JobChecklistItem

    # Check template constraints
    if template.end_date and template.end_date < date_from:
        # Template expired
        return 0

    # Get already-generated dates
    existing_dates = set(
        GeneratedVisitLog.objects.filter(template=template)
        .values_list("scheduled_date", flat=True)
    )

    # Calculate visit dates
    interval_days = template.get_interval_days()
    current_date = template.start_date

    # Adjust end date if template has earlier end_date
    end_date = date_to
    if template.end_date and template.end_date < end_date:
        end_date = template.end_date

    # Find all dates within range that need visits
    visit_dates = []
    while current_date <= end_date:
        # Only generate for dates >= date_from and not already generated
        if current_date >= date_from and current_date not in existing_dates:
            visit_dates.append(current_date)
        current_date += timedelta(days=interval_days)

    if not visit_dates:
        return 0

    # Create visits in a transaction
    created_count = 0

    with transaction.atomic():
        for visit_date in visit_dates:
            # Create Job with context=CONTEXT_MAINTENANCE
            job = Job.objects.create(
                company=template.company,
                location=template.location,
                asset=template.asset,
                cleaner=template.assigned_technician,
                scheduled_date=visit_date,
                scheduled_start_time=template.scheduled_start_time,
                scheduled_end_time=template.scheduled_end_time,
                status=Job.STATUS_SCHEDULED,
                context=Job.CONTEXT_MAINTENANCE,
                maintenance_category=template.maintenance_category,
                manager_notes=template.manager_notes,
            )

            # Copy checklist items from template
            if template.checklist_template:
                template_items = template.checklist_template.items.all()
                for item in template_items:
                    JobChecklistItem.objects.create(
                        job=job,
                        label=item.label,
                        order=item.order,
                        completed=False,
                    )

            # Create log entry (generated_by=None for automated generation)
            GeneratedVisitLog.objects.create(
                template=template,
                job=job,
                scheduled_date=visit_date,
                generated_by=None,  # Automated generation
            )

            created_count += 1

    return created_count


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_sla_warnings(self):
    """
    Check for visits approaching or exceeding SLA deadlines.

    Runs hourly (configured in config/celery.py).
    Sends notification emails for visits:
    - Approaching SLA deadline (within 24 hours)
    - Already exceeded SLA deadline

    Returns:
        dict with check statistics
    """
    from apps.jobs.models import Job
    from apps.maintenance.notifications import send_sla_warning

    logger.info("Starting SLA warning check")

    now = timezone.now()
    warning_threshold = now + timedelta(hours=24)

    stats = {
        "visits_checked": 0,
        "warnings_sent": 0,
        "already_warned": 0,
        "errors": [],
    }

    # Find maintenance visits with SLA deadlines approaching/exceeded
    # Status must be scheduled or in_progress (not completed/cancelled)
    visits = Job.objects.filter(
        context=Job.CONTEXT_MAINTENANCE,
        status__in=[Job.STATUS_SCHEDULED, Job.STATUS_IN_PROGRESS],
        sla_deadline__isnull=False,
        sla_deadline__lte=warning_threshold,
    ).select_related(
        "company", "location", "cleaner", "asset", "maintenance_category"
    )

    for visit in visits:
        stats["visits_checked"] += 1

        try:
            # Check if warning was already sent recently (within 12 hours)
            from apps.maintenance.models import MaintenanceNotificationLog

            recent_warning = MaintenanceNotificationLog.objects.filter(
                job=visit,
                kind=MaintenanceNotificationLog.KIND_SLA_WARNING,
                created_at__gte=now - timedelta(hours=12),
            ).exists()

            if recent_warning:
                stats["already_warned"] += 1
                continue

            # Send SLA warning notification
            is_overdue = visit.sla_deadline < now
            send_sla_warning(visit, is_overdue=is_overdue)
            stats["warnings_sent"] += 1

            logger.info(
                f"SLA warning sent for Job #{visit.id} "
                f"(deadline: {visit.sla_deadline}, overdue: {is_overdue})"
            )

        except Exception as e:
            stats["errors"].append({
                "job_id": visit.id,
                "error": str(e),
            })
            logger.error(f"Error sending SLA warning for Job #{visit.id}: {e}")

    logger.info(
        f"SLA check complete: "
        f"{stats['visits_checked']} checked, "
        f"{stats['warnings_sent']} warnings sent, "
        f"{stats['already_warned']} already warned"
    )

    return stats
