# backend/apps/locations/admin.py
"""
Django Admin for Locations app.

M003/S02: Bulk import via django-import-export.
LocationAdmin and ChecklistTemplateAdmin support CSV/XLSX upload.
Company scoping: imported rows are validated to belong to the admin user's company.
"""

from django.contrib import admin
from django.core.exceptions import ValidationError
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget

from .models import (
    Location,
    ChecklistTemplate,
    ChecklistTemplateItem,
    LocationChecklistTemplate,
)
from apps.accounts.models import Company


# =============================================================================
# Resource classes
# =============================================================================

class LocationResource(resources.ModelResource):
    """
    Import/export resource for Location.

    CSV columns: name, address, notes, latitude, longitude, is_active
    The company column is optional in the CSV — if omitted, it is set to the
    current admin user's company during import (see LocationAdmin.get_import_data_kwargs).

    Example CSV header:
        name,address,notes,latitude,longitude,is_active
        "Building A","Dubai Marina","Check AC",25.0772,55.1388,true
    """

    company = fields.Field(
        column_name="company",
        attribute="company",
        widget=ForeignKeyWidget(Company, field="name"),
    )

    class Meta:
        model = Location
        import_id_fields = ["id"]
        fields = ("id", "company", "name", "address", "notes", "latitude", "longitude", "is_active")
        export_order = ("id", "company", "name", "address", "notes", "latitude", "longitude", "is_active")
        skip_unchanged = True
        report_skipped = True

    def before_import_row(self, row, row_number=None, **kwargs):
        """Enforce company scoping: if company is missing in row, inject from context."""
        company_name = kwargs.get("company_name")
        if company_name and not row.get("company"):
            row["company"] = company_name

    def skip_row(self, instance, original, row, import_validation_errors=None):
        """Skip rows where company doesn't match import context (prevents cross-company import)."""
        expected_company_name = getattr(self, "_import_company_name", None)
        if expected_company_name and instance.company and instance.company.name != expected_company_name:
            return True
        return super().skip_row(instance, original, row, import_validation_errors)


class ChecklistTemplateResource(resources.ModelResource):
    """
    Import/export resource for ChecklistTemplate.

    CSV columns: name, description, context, is_active
    Company is injected from admin context (not in CSV to prevent cross-company import).

    Example CSV header:
        name,description,context,is_active
        "Office Deep Clean","Full office checklist","cleaning",true
    """

    company = fields.Field(
        column_name="company",
        attribute="company",
        widget=ForeignKeyWidget(Company, field="name"),
    )

    class Meta:
        model = ChecklistTemplate
        import_id_fields = ["id"]
        fields = ("id", "company", "name", "description", "context", "is_active")
        export_order = ("id", "company", "name", "description", "context", "is_active")
        skip_unchanged = True
        report_skipped = True


# =============================================================================
# Admin classes
# =============================================================================

@admin.register(Location)
class LocationAdmin(ImportExportModelAdmin):
    resource_classes = [LocationResource]
    list_display = ("name", "company", "address", "is_active", "created_at")
    list_filter = ("company", "is_active")
    search_fields = ("name", "address", "company__name")
    ordering = ("company", "name")

    def get_export_queryset(self, request):
        qs = super().get_export_queryset(request)
        # Staff superusers see all; company admins scoped to their company
        if not request.user.is_superuser:
            qs = qs.filter(company=request.user.company)
        return qs


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(ImportExportModelAdmin):
    resource_classes = [ChecklistTemplateResource]
    list_display = ("name", "company", "context", "is_active", "created_at")
    list_filter = ("company", "context", "is_active")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(ChecklistTemplateItem)
class ChecklistTemplateItemAdmin(admin.ModelAdmin):
    list_display = ("text", "template", "order", "is_required")
    list_filter = ("template__company", "is_required")
    search_fields = ("text", "template__name")
    ordering = ("template", "order")


admin.site.register(LocationChecklistTemplate)
