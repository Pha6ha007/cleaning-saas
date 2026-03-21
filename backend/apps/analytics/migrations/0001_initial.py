"""Create PageView table for anonymous analytics."""
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PageView",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("path", models.CharField(max_length=500)),
                ("referrer", models.URLField(blank=True, default="", max_length=1000)),
                ("session_id", models.CharField(db_index=True, max_length=64)),
                ("timestamp", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "analytics_page_view",
                "ordering": ["-timestamp"],
                "verbose_name": "Page View",
                "verbose_name_plural": "Page Views",
            },
        ),
        migrations.AddIndex(
            model_name="pageview",
            index=models.Index(fields=["path", "timestamp"], name="analytics_p_path_idx"),
        ),
    ]
