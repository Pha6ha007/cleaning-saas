from django.contrib import admin
from .models import WebhookEndpoint, WebhookDeliveryLog


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
    list_display = ["company", "url_short", "is_active", "events", "created_at"]
    list_filter = ["is_active", "company"]
    search_fields = ["company__name", "url", "description"]
    readonly_fields = ["created_at", "updated_at", "secret"]
    ordering = ["-created_at"]

    def url_short(self, obj):
        return obj.url[:60] + "..." if len(obj.url) > 60 else obj.url
    url_short.short_description = "URL"

    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing existing — secret is read-only
            return self.readonly_fields
        return ["created_at", "updated_at"]  # new object: secret auto-generated


@admin.register(WebhookDeliveryLog)
class WebhookDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ["event", "status", "http_status", "duration_ms", "created_at", "endpoint_url"]
    list_filter = ["status", "event"]
    readonly_fields = [
        "endpoint", "event", "payload", "status", "http_status",
        "response_body", "error_message", "duration_ms", "created_at",
    ]
    ordering = ["-created_at"]

    def endpoint_url(self, obj):
        return obj.endpoint.url[:50]
    endpoint_url.short_description = "Endpoint"

    def has_add_permission(self, request):
        return False  # logs are created by tasks only

    def has_change_permission(self, request, obj=None):
        return False  # immutable audit trail
