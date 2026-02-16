"""
Management command to manually check SLA warnings.

Usage:
    python manage.py check_sla
    python manage.py check_sla --dry-run  # Preview only

See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 14)
"""

from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone


class Command(BaseCommand):
    help = "Check and send SLA warning notifications"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview which warnings would be sent without sending them",
        )
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Check visits with SLA deadline within N hours (default: 24)",
        )

    def handle(self, *args, **options):
        from apps.jobs.models import Job
        from apps.maintenance.models import MaintenanceNotificationLog

        dry_run = options["dry_run"]
        hours = options["hours"]

        now = timezone.now()
        warning_threshold = now + timedelta(hours=hours)

        self.stdout.write(
            f"Checking SLA deadlines until {warning_threshold}"
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN mode - no notifications will be sent")
            )

        # Find visits with approaching SLA deadlines
        visits = Job.objects.filter(
            context=Job.CONTEXT_MAINTENANCE,
            status__in=[Job.STATUS_SCHEDULED, Job.STATUS_IN_PROGRESS],
            sla_deadline__isnull=False,
            sla_deadline__lte=warning_threshold,
        ).select_related(
            "company", "location", "cleaner", "asset"
        )

        if not visits.exists():
            self.stdout.write(
                self.style.SUCCESS("No visits with approaching SLA deadlines.")
            )
            return

        warnings_to_send = 0
        already_warned = 0
        sent = 0

        for visit in visits:
            is_overdue = visit.sla_deadline < now
            status_text = "OVERDUE" if is_overdue else "Warning"

            self.stdout.write(
                f"\n[{status_text}] Job #{visit.id}:"
            )
            self.stdout.write(f"  Location: {visit.location.name}")
            self.stdout.write(f"  Deadline: {visit.sla_deadline}")
            self.stdout.write(f"  Technician: {visit.cleaner.full_name if visit.cleaner else 'Unassigned'}")

            # Check if already warned
            recent_warning = MaintenanceNotificationLog.objects.filter(
                job=visit,
                kind=MaintenanceNotificationLog.KIND_SLA_WARNING,
                created_at__gte=now - timedelta(hours=12),
            ).exists()

            if recent_warning:
                self.stdout.write(
                    self.style.WARNING("  -> Already warned within 12 hours")
                )
                already_warned += 1
                continue

            warnings_to_send += 1

            if dry_run:
                self.stdout.write("  -> Would send warning")
                continue

            # Send warning
            from apps.maintenance.notifications import send_sla_warning

            success = send_sla_warning(visit, is_overdue=is_overdue)
            if success:
                sent += 1
                self.stdout.write(self.style.SUCCESS("  -> Warning sent"))
            else:
                self.stdout.write(self.style.ERROR("  -> Failed to send warning"))

        self.stdout.write("")
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY RUN complete: Would send {warnings_to_send} warnings, "
                    f"{already_warned} already warned"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Check complete: Sent {sent} warnings, "
                    f"{already_warned} already warned"
                )
            )
