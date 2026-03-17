# backend/apps/maintenance/admin.py
"""
Django Admin for Maintenance app.

M003/S02: AssetAdmin upgraded to ImportExportModelAdmin for bulk CSV/XLSX import.
"""

from django.contrib import admin
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget

from .models import (
    AssetType,
    Asset,
    MaintenanceCategory,
    MaintenanceNotificationLog,
    WhatsAppNotificationLog,
)
from apps.accounts.models import Company
from apps.locations.models import Location


# =============================================================================
# Resource classes
# =============================================================================

class AssetResource(resources.ModelResource):
    """
    Import/export resource for Asset.

    CSV columns: name, serial_number, description, is_active
    company, location, and asset_type are resolved by name from context.

    Example CSV header:
        name,serial_number,description,is_active
        "HVAC Unit 1","SN-12345","Rooftop AC unit, floor 3",true
        "Elevator A","ELV-001","Main elevator",true
    """

    company = fields.Field(
        column_name="company",
        attribute="company",
        widget=ForeignKeyWidget(Company, field="name"),
    )
    location = fields.Field(
        column_name="location",
        attribute="location",
        widget=ForeignKeyWidget(Location, field="name"),
    )
    asset_type = fields.Field(
        column_name="asset_type",
        attribute="asset_type",
        widget=ForeignKeyWidget(AssetType, field="name"),
    )

    class Meta:
        model = Asset
        import_id_fields = ["id"]
        fields = (
            "id", "company", "location", "asset_type",
            "name", "serial_number", "description",
            "is_active", "warranty_start_date", "warranty_end_date",
            "warranty_provider", "warranty_notes",
        )
        export_order = (
            "id", "company", "location", "asset_type",
            "name", "serial_number", "description", "is_active",
        )
        skip_unchanged = True
        report_skipped = True


# =============================================================================
# Admin classes
# =============================================================================

@admin.register(AssetType)
class AssetTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "is_active", "created_at"]
    list_filter = ["is_active", "company"]
    search_fields = ["name", "description"]


@admin.register(Asset)
class AssetAdmin(ImportExportModelAdmin):
    resource_classes = [AssetResource]
    list_display = ["name", "asset_type", "location", "company", "is_active", "created_at"]
    list_filter = ["is_active", "asset_type", "location", "company"]
    search_fields = ["name", "serial_number", "description"]
    raw_id_fields = ["company", "location", "asset_type"]


@admin.register(MaintenanceCategory)
class MaintenanceCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "is_active"]
    list_filter = ["company", "is_active"]
    search_fields = ["name"]


@admin.register(MaintenanceNotificationLog)
class MaintenanceNotificationLogAdmin(admin.ModelAdmin):
    list_display = ["kind", "status", "to_email", "company", "created_at"]
    list_filter = ["kind", "status", "company"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]


@admin.register(WhatsAppNotificationLog)
class WhatsAppNotificationLogAdmin(admin.ModelAdmin):
    list_display = ["kind", "status", "to_phone", "company", "wa_message_id", "created_at"]
    list_filter = ["kind", "status", "company"]
    readonly_fields = ["created_at", "wa_message_id"]
    ordering = ["-created_at"]
