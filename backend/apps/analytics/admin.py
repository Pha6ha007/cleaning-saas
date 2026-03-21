from django.contrib import admin
from .models import PageView


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ("path", "session_id", "timestamp")
    list_filter = ("timestamp",)
    search_fields = ("path", "session_id")
    readonly_fields = ("path", "referrer", "session_id", "timestamp", "created_at")
    date_hierarchy = "timestamp"
