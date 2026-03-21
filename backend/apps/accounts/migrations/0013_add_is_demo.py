"""Add is_demo field to User model."""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0012_add_password_reset_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_demo",
            field=models.BooleanField(
                default=False,
                help_text="Demo account — read-only, no billing",
            ),
        ),
    ]
