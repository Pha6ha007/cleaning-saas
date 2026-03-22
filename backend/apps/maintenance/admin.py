# backend/apps/maintenance/admin.py
"""
Django Admin for Maintenance app.

M003/S02: AssetAdmin upgraded to ImportExportModelAdmin for bulk CSV/XLSX import.
M011/S03: Added admin for ServiceContract, RecurringVisitTemplate, Part,
          StockAdjustment, VisitPart, AssetDocument, GeneratedVisitLog.
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
    ServiceContract,
    RecurringVisitTemplate,
    GeneratedVisitLog,
    Part,
    StockAdjustment,
    VisitPart,
    AssetDocument,
)
from apps.accounts.models import Company
from apps.locations.models import Location


# =============================================================================
# Resource classes
# =============================================================================

class AssetResource(resources.ModelResource):
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
# Admin classes — existing
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


# =============================================================================
# Admin classes — M011/S03: newly registered models
# =============================================================================

@admin.register(ServiceContract)
class ServiceContractAdmin(admin.ModelAdmin):
    list_display = [
        "name", "contract_type", "status", "location", "company",
        "start_date", "end_date", "created_at",
    ]
    list_filter = ["contract_type", "status", "company"]
    search_fields = ["name", "contract_number", "customer_name"]
    raw_id_fields = ["company", "location", "created_by"]
    date_hierarchy = "start_date"
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(RecurringVisitTemplate)
class RecurringVisitTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "name", "frequency", "is_active", "company",
        "location", "start_date", "end_date", "created_at",
    ]
    list_filter = ["frequency", "is_active", "company"]
    search_fields = ["name", "description"]
    raw_id_fields = ["company", "location", "asset", "assigned_technician",
                     "checklist_template", "service_contract"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(GeneratedVisitLog)
class GeneratedVisitLogAdmin(admin.ModelAdmin):
    list_display = ["template", "job", "scheduled_date", "generated_at"]
    list_filter = ["template__company"]
    search_fields = ["template__name"]
    raw_id_fields = ["template", "job"]
    ordering = ["-generated_at"]
    readonly_fields = ["generated_at"]


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = [
        "name", "sku", "company", "is_active",
        "stock_quantity", "unit", "created_at",
    ]
    list_filter = ["is_active", "company", "unit"]
    search_fields = ["name", "sku", "description"]
    raw_id_fields = ["company"]
    ordering = ["name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = [
        "part", "adjustment_type", "quantity",
        "quantity_after", "adjusted_by", "adjusted_at",
    ]
    list_filter = ["adjustment_type", "part__company"]
    search_fields = ["part__name", "reason"]
    raw_id_fields = ["part", "adjusted_by"]
    ordering = ["-adjusted_at"]
    readonly_fields = ["adjusted_at", "quantity_after"]


@admin.register(VisitPart)
class VisitPartAdmin(admin.ModelAdmin):
    list_display = ["part", "job", "quantity", "added_by", "added_at"]
    list_filter = ["part__company"]
    search_fields = ["part__name", "notes"]
    raw_id_fields = ["job", "part", "added_by"]
    ordering = ["-added_at"]
    readonly_fields = ["added_at"]


@admin.register(AssetDocument)
class AssetDocumentAdmin(admin.ModelAdmin):
    list_display = ["name", "asset", "document_type", "uploaded_by", "uploaded_at"]
    list_filter = ["document_type", "asset__company"]
    search_fields = ["name", "description", "asset__name"]
    raw_id_fields = ["asset", "uploaded_by"]
    ordering = ["-uploaded_at"]
    readonly_fields = ["uploaded_at", "file_size", "mime_type"]
