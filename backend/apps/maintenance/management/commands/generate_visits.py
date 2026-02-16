"""
Management command to manually trigger recurring visit generation.

Usage:
    python manage.py generate_visits
    python manage.py generate_visits --lookahead 60  # 60 days ahead
    python manage.py generate_visits --dry-run       # Preview only

See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 14)
"""

from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone


class Command(BaseCommand):
    help = "Generate visits from recurring templates"

    def add_arguments(self, parser):
        parser.add_argument(
            "--lookahead",
            type=int,
            default=30,
            help="Number of days to look ahead for visit generation (default: 30)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview which visits would be generated without creating them",
        )
        parser.add_argument(
            "--template-id",
            type=int,
            help="Generate visits for a specific template only",
        )

    def handle(self, *args, **options):
        from apps.maintenance.models import RecurringVisitTemplate, GeneratedVisitLog

        lookahead_days = options["lookahead"]
        dry_run = options["dry_run"]
        template_id = options.get("template_id")

        today = timezone.now().date()
        date_to = today + timedelta(days=lookahead_days)

        self.stdout.write(
            f"Generating visits from {today} to {date_to} "
            f"(lookahead: {lookahead_days} days)"
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN mode - no visits will be created")
            )

        # Get templates
        templates = RecurringVisitTemplate.objects.filter(
            is_active=True
        ).select_related(
            "company", "asset", "location", "checklist_template",
            "maintenance_category", "assigned_technician"
        )

        if template_id:
            templates = templates.filter(pk=template_id)

        if not templates.exists():
            self.stdout.write(self.style.WARNING("No active templates found."))
            return

        total_created = 0
        total_skipped = 0

        for template in templates:
            self.stdout.write(f"\nProcessing template: {template.name} (ID={template.id})")

            # Check template constraints
            if template.end_date and template.end_date < today:
                self.stdout.write(
                    self.style.WARNING(f"  -> Skipped: Template expired on {template.end_date}")
                )
                continue

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

            visit_dates = []
            while current_date <= end_date:
                if current_date >= today and current_date not in existing_dates:
                    visit_dates.append(current_date)
                current_date += timedelta(days=interval_days)

            if not visit_dates:
                self.stdout.write(f"  -> No new visits to generate")
                total_skipped += 1
                continue

            self.stdout.write(f"  -> {len(visit_dates)} visits to generate:")
            for vd in visit_dates[:5]:  # Show first 5
                self.stdout.write(f"     - {vd}")
            if len(visit_dates) > 5:
                self.stdout.write(f"     ... and {len(visit_dates) - 5} more")

            if dry_run:
                total_created += len(visit_dates)
                continue

            # Actually generate
            from apps.maintenance.tasks import _generate_visits_for_template

            created_count = _generate_visits_for_template(
                template=template,
                date_from=today,
                date_to=date_to,
            )
            total_created += created_count
            self.stdout.write(
                self.style.SUCCESS(f"  -> Created {created_count} visits")
            )

        self.stdout.write("")
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY RUN complete: Would create {total_created} visits"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Generation complete: Created {total_created} visits, "
                    f"skipped {total_skipped} templates"
                )
            )
