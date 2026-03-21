# Generated manually — PasswordResetToken model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("apps_accounts", "0011_add_branch_model"),
    ]

    operations = [
        migrations.CreateModel(
            name="PasswordResetToken",
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
                    "token",
                    models.UUIDField(
                        default=uuid.uuid4,
                        unique=True,
                        db_index=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="password_reset_tokens",
                        to="apps_accounts.user",
                    ),
                ),
            ],
            options={
                "verbose_name": "Password Reset Token",
                "verbose_name_plural": "Password Reset Tokens",
                "db_table": "password_reset_tokens",
            },
        ),
    ]
