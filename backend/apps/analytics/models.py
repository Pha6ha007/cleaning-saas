"""Anonymous page view tracking model."""
from django.db import models
from django.utils import timezone


class PageView(models.Model):
    """Anonymous page view event — no PII."""
    path = models.CharField(max_length=500)
    referrer = models.URLField(max_length=1000, blank=True, default="")
    session_id = models.CharField(max_length=64, db_index=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "analytics"
        db_table = "analytics_page_view"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["path", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.path} @ {self.timestamp}"
