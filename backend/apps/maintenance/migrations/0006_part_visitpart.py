# Stage 7: Parts & Inventory (Lite)
# Migration for Part and VisitPart models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("apps_accounts", "0001_initial"),
        ("apps_jobs", "0001_initial"),
        ("apps_maintenance", "0005_maintenancenotificationlog"),
    ]

    operations = [
        migrations.CreateModel(
            name="Part",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                (
                    "sku",
                    models.CharField(
                        blank=True,
                        help_text="Optional part number or SKU",
                        max_length=50,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                (
                    "unit",
                    models.CharField(
                        choices=[
                            ("pcs", "Pieces"),
                            ("m", "Meters"),
                            ("kg", "Kilograms"),
                            ("L", "Liters"),
                            ("set", "Sets"),
                        ],
                        default="pcs",
                        help_text="Unit of measurement",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="parts",
                        to="apps_accounts.company",
                    ),
                ),
            ],
            options={
                "verbose_name": "Part",
                "verbose_name_plural": "Parts",
                "ordering": ["name"],
                "unique_together": {("company", "name")},
            },
        ),
        migrations.CreateModel(
            name="VisitPart",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "quantity",
                    models.DecimalField(
                        decimal_places=2,
                        default=1,
                        help_text="Quantity used",
                        max_digits=10,
                    ),
                ),
                (
                    "notes",
                    models.CharField(
                        blank=True,
                        help_text="Optional notes about this part usage",
                        max_length=200,
                    ),
                ),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                (
                    "added_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="added_visit_parts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "job",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="used_parts",
                        to="apps_jobs.job",
                    ),
                ),
                (
                    "part",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="usage_records",
                        to="apps_maintenance.part",
                    ),
                ),
            ],
            options={
                "verbose_name": "Visit Part",
                "verbose_name_plural": "Visit Parts",
                "ordering": ["-added_at"],
            },
        ),
    ]
