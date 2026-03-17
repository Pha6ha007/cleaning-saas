from django.apps import AppConfig


class WebhooksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.webhooks"
    label = "apps_webhooks"
    verbose_name = "Outgoing Webhooks"
