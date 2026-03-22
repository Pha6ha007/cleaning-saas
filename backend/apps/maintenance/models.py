"""
Maintenance Context Models (V1)

These models support the Maintenance Context operational layer.
See: docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md

IMPORTANT: These are additive models only. They do not modify
Platform Layer invariants (roles, lifecycle, billing, RBAC).
"""

from django.db import models
from apps.accounts.models import Company
from apps.locations.models import Location


class MaintenanceCategory(models.Model):
    """
    Service category for maintenance visits.

    Examples: Preventive, Corrective, Emergency, Inspection

    Company-scoped: each company defines their own categories.
    Used to classify Jobs when they are maintenance service visits.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="maintenance_categories"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ["company", "name"]
        verbose_name_plural = "Maintenance categories"

    def __str__(self):
        return self.name


class AssetType(models.Model):
    """
    Asset classification/category.

    Examples: HVAC, Electrical, Plumbing, Elevator, IT Infrastructure

    Company-scoped: each company manages their own asset types.

    Stage 9: Added default_checklist_template for auto-applying checklists.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="asset_types"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # Stage 9: Default checklist for assets of this type
    default_checklist_template = models.ForeignKey(
        'apps_locations.ChecklistTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="asset_types",
        help_text="Default checklist applied when creating visits for assets of this type"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ["company", "name"]

    def __str__(self):
        return self.name


class Asset(models.Model):
    """
    Physical asset being serviced.

    Examples: "AHU-01 Main Building", "Elevator #2", "Server Rack A"

    Company-scoped with required location and asset type.
    Jobs can optionally link to an asset for service visit tracking.

    Stage 5 Lite: Added warranty tracking fields.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="assets"
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="assets"
    )
    asset_type = models.ForeignKey(
        AssetType,
        on_delete=models.PROTECT,
        related_name="assets"
    )
    name = models.CharField(max_length=200)
    serial_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    # Stage 5 Lite: Warranty tracking
    warranty_start_date = models.DateField(
        null=True,
        blank=True,
        help_text="Start date of manufacturer warranty"
    )
    warranty_end_date = models.DateField(
        null=True,
        blank=True,
        help_text="End date of manufacturer warranty"
    )
    warranty_provider = models.CharField(
        max_length=200,
        blank=True,
        help_text="Warranty provider or manufacturer name"
    )
    warranty_notes = models.TextField(
        blank=True,
        help_text="Additional warranty terms or notes"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["company", "location", "is_active"], name="asset_co_loc_active_idx"),
            models.Index(fields=["company", "is_active"], name="asset_co_active_idx"),
        ]

    @property
    def warranty_status(self) -> str:
        """
        Returns warranty status: 'active', 'expired', 'expiring_soon', or 'no_warranty'.
        'expiring_soon' means within 30 days.
        """
        if not self.warranty_end_date:
            return "no_warranty"

        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now().date()

        if self.warranty_end_date < today:
            return "expired"
        elif self.warranty_end_date <= today + timedelta(days=30):
            return "expiring_soon"
        else:
            return "active"


# =============================================================================
# Stage 5 Lite: Service Contracts
# =============================================================================

class ServiceContract(models.Model):
    """
    Service contract for maintenance services.

    Represents an agreement to provide maintenance services.
    Can be linked to recurring visit templates to track contract-based visits.

    Types:
    - SERVICE: General service agreement
    - WARRANTY: Extended warranty service
    - PREVENTIVE: Preventive maintenance agreement

    No billing integration in Stage 5 Lite.
    See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 5)
    """

    CONTRACT_TYPE_SERVICE = "service"
    CONTRACT_TYPE_WARRANTY = "warranty"
    CONTRACT_TYPE_PREVENTIVE = "preventive"

    CONTRACT_TYPE_CHOICES = [
        (CONTRACT_TYPE_SERVICE, "Service Agreement"),
        (CONTRACT_TYPE_WARRANTY, "Warranty Service"),
        (CONTRACT_TYPE_PREVENTIVE, "Preventive Maintenance"),
    ]

    STATUS_ACTIVE = "active"
    STATUS_EXPIRED = "expired"
    STATUS_CANCELLED = "cancelled"
    STATUS_DRAFT = "draft"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    # Company scope
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="service_contracts"
    )

    # Contract identity
    name = models.CharField(
        max_length=200,
        help_text="Contract name or title"
    )
    contract_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="External contract reference number"
    )
    description = models.TextField(blank=True)

    # Customer (simple text field - no Customer model in V1)
    customer_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Customer or client name"
    )
    customer_contact = models.CharField(
        max_length=200,
        blank=True,
        help_text="Customer contact (phone/email)"
    )

    # Scope: Location(s) covered by contract
    # If null, contract is company-wide
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_contracts",
        help_text="Specific location covered by this contract (optional)"
    )

    # Contract type and status
    contract_type = models.CharField(
        max_length=20,
        choices=CONTRACT_TYPE_CHOICES,
        default=CONTRACT_TYPE_SERVICE
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        db_index=True,
    )

    # Contract period
    start_date = models.DateField(
        help_text="Contract start date",
        db_index=True,
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Contract end date (null = open-ended)",
        db_index=True,
    )

    # Service terms (informational, no billing logic)
    service_terms = models.TextField(
        blank=True,
        help_text="Service terms, SLA commitments, scope of work"
    )
    visits_included = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Number of visits included in contract (informational)"
    )

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_contracts"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Service Contract"
        verbose_name_plural = "Service Contracts"
        indexes = [
            models.Index(fields=["company", "status", "end_date"], name="contract_co_status_end_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_contract_type_display()})"

    @property
    def is_expired(self) -> bool:
        """Check if contract has expired based on end_date."""
        if not self.end_date:
            return False
        from django.utils import timezone
        return self.end_date < timezone.now().date()

    @property
    def days_remaining(self) -> int | None:
        """Days until contract expires. None if no end_date."""
        if not self.end_date:
            return None
        from django.utils import timezone
        delta = self.end_date - timezone.now().date()
        return delta.days


# =============================================================================
# Stage 3: Recurring Execution
# =============================================================================

class RecurringVisitTemplate(models.Model):
    """
    Template for recurring maintenance visits.

    Managers define schedule patterns (monthly, quarterly, yearly, custom interval).
    Visits are generated on demand via "Generate Visits" button (batch generation).

    Each generated Job is a normal Job with context=CONTEXT_MAINTENANCE.
    GeneratedVisitLog tracks which visits were created from which template.

    See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 3)
    """

    # Frequency choices
    FREQUENCY_MONTHLY = "monthly"
    FREQUENCY_QUARTERLY = "quarterly"
    FREQUENCY_YEARLY = "yearly"
    FREQUENCY_CUSTOM = "custom"

    FREQUENCY_CHOICES = [
        (FREQUENCY_MONTHLY, "Monthly"),
        (FREQUENCY_QUARTERLY, "Quarterly"),
        (FREQUENCY_YEARLY, "Yearly"),
        (FREQUENCY_CUSTOM, "Custom Interval"),
    ]

    # Company scope
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="recurring_visit_templates"
    )

    # Template identity
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Binding: Asset (optional) or Location (required)
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recurring_templates",
        help_text="Optional: Link recurring visits to specific asset"
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="recurring_maintenance_templates",
        help_text="Required: Location for all generated visits"
    )

    # Schedule
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default=FREQUENCY_MONTHLY
    )
    interval_days = models.PositiveIntegerField(
        default=30,
        help_text="Used when frequency='custom'. Interval in days between visits."
    )
    start_date = models.DateField(
        help_text="First possible visit date"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Optional: Stop generating visits after this date"
    )

    # Visit defaults
    checklist_template = models.ForeignKey(
        'apps_locations.ChecklistTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_maintenance_templates"
    )
    maintenance_category = models.ForeignKey(
        MaintenanceCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_templates"
    )
    assigned_technician = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_template_assignments",
        help_text="Default technician for generated visits"
    )
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)
    manager_notes = models.TextField(blank=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Stage 5 Lite: Link to service contract
    service_contract = models.ForeignKey(
        ServiceContract,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_templates",
        help_text="Optional: Link recurring visits to a service contract"
    )

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_recurring_templates"
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Recurring Visit Template"
        verbose_name_plural = "Recurring Visit Templates"
        indexes = [
            models.Index(fields=["company", "is_active", "start_date"], name="rvt_co_active_start_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"

    def get_interval_days(self) -> int:
        """Return the interval in days based on frequency."""
        if self.frequency == self.FREQUENCY_MONTHLY:
            return 30
        elif self.frequency == self.FREQUENCY_QUARTERLY:
            return 90
        elif self.frequency == self.FREQUENCY_YEARLY:
            return 365
        else:  # custom
            return self.interval_days


class GeneratedVisitLog(models.Model):
    """
    Tracks which visits (Jobs) were generated from which template.

    Used to:
    1. Prevent duplicate generation for the same date
    2. Track history of auto-generated visits
    3. Allow filtering visits by source template

    unique_together on (template, scheduled_date) ensures idempotent generation.
    """
    template = models.ForeignKey(
        RecurringVisitTemplate,
        on_delete=models.CASCADE,
        related_name="generated_visits"
    )
    job = models.ForeignKey(
        'apps_jobs.Job',
        on_delete=models.CASCADE,
        related_name="recurring_source"
    )
    scheduled_date = models.DateField()
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="generated_visits"
    )

    class Meta:
        unique_together = ["template", "scheduled_date"]
        ordering = ["-scheduled_date"]
        verbose_name = "Generated Visit Log"
        verbose_name_plural = "Generated Visit Logs"

    def __str__(self):
        return f"{self.template.name} -> Job #{self.job_id} ({self.scheduled_date})"


# =============================================================================
# Stage 6: Notifications Layer
# =============================================================================

class MaintenanceNotificationLog(models.Model):
    """
    Audit log for sent maintenance notifications.

    Tracks all email notifications sent for maintenance visits.
    Notifications are sent:
    - Automatically on assignment and completion
    - Manually via "Send Notification" button

    See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 6)
    """

    KIND_VISIT_REMINDER = "visit_reminder"
    KIND_SLA_WARNING = "sla_warning"
    KIND_ASSIGNMENT = "assignment"
    KIND_COMPLETION = "completion"

    KIND_CHOICES = [
        (KIND_VISIT_REMINDER, "Visit Reminder"),
        (KIND_SLA_WARNING, "SLA Warning"),
        (KIND_ASSIGNMENT, "Assignment Alert"),
        (KIND_COMPLETION, "Completion Notification"),
    ]

    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
    ]

    # Company scope
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="maintenance_notifications"
    )

    # Notification type and status
    kind = models.CharField(max_length=30, choices=KIND_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)

    # Target job
    job = models.ForeignKey(
        'apps_jobs.Job',
        on_delete=models.SET_NULL,
        null=True,
        related_name="maintenance_notifications"
    )

    # Recipient
    to_email = models.EmailField()
    recipient_user = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="received_maintenance_notifications"
    )

    # Content (stored for audit)
    subject = models.CharField(max_length=200)
    error_message = models.TextField(blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    triggered_by = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="triggered_maintenance_notifications"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Maintenance Notification Log"
        verbose_name_plural = "Maintenance Notification Logs"
        indexes = [
            models.Index(fields=["company", "kind", "created_at"]),
        ]

    def __str__(self):
        return f"{self.get_kind_display()} -> {self.to_email} ({self.status})"


# =============================================================================
# M002: WhatsApp Business Notification Log
# =============================================================================

class WhatsAppNotificationLog(models.Model):
    """
    Audit log for WhatsApp notifications sent via pywa.

    Parallel to MaintenanceNotificationLog (email).
    Stores the WhatsApp message ID returned by Meta's API for delivery tracking.

    See: apps/maintenance/whatsapp.py
    """

    KIND_ASSIGNMENT = "assignment"
    KIND_COMPLETION = "completion"
    KIND_SLA_WARNING = "sla_warning"

    KIND_CHOICES = [
        (KIND_ASSIGNMENT, "Assignment Alert"),
        (KIND_COMPLETION, "Completion Notification"),
        (KIND_SLA_WARNING, "SLA Warning"),
    ]

    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
    ]

    # Company scope
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="whatsapp_notifications",
    )

    # Notification type and outcome
    kind = models.CharField(max_length=30, choices=KIND_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)

    # Target job
    job = models.ForeignKey(
        "apps_jobs.Job",
        on_delete=models.SET_NULL,
        null=True,
        related_name="whatsapp_notifications",
    )

    # Recipient
    to_phone = models.CharField(max_length=30)
    recipient_user = models.ForeignKey(
        "apps_accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_whatsapp_notifications",
    )

    # WhatsApp message ID returned by Meta API (for delivery tracking)
    wa_message_id = models.CharField(max_length=128, blank=True)

    # Error detail if failed
    error_message = models.TextField(blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    triggered_by = models.ForeignKey(
        "apps_accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="triggered_whatsapp_notifications",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "WhatsApp Notification Log"
        verbose_name_plural = "WhatsApp Notification Logs"
        indexes = [
            models.Index(fields=["company", "kind", "created_at"]),
        ]

    def __str__(self):
        return f"WA {self.get_kind_display()} → {self.to_phone} ({self.status})"


# =============================================================================
# Stage 7: Parts & Inventory (Lite)
# =============================================================================

class Part(models.Model):
    """
    Catalog of parts/consumables for maintenance.

    Company-scoped, no inventory tracking in Lite version.
    Parts can be linked to service visits to track usage.

    See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 7)
    """

    # Common units for parts
    UNIT_PCS = "pcs"
    UNIT_M = "m"
    UNIT_KG = "kg"
    UNIT_L = "L"
    UNIT_SET = "set"

    UNIT_CHOICES = [
        (UNIT_PCS, "Pieces"),
        (UNIT_M, "Meters"),
        (UNIT_KG, "Kilograms"),
        (UNIT_L, "Liters"),
        (UNIT_SET, "Sets"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="parts"
    )
    name = models.CharField(max_length=200)
    sku = models.CharField(
        max_length=50,
        blank=True,
        help_text="Optional part number or SKU"
    )
    description = models.TextField(blank=True)
    unit = models.CharField(
        max_length=20,
        choices=UNIT_CHOICES,
        default=UNIT_PCS,
        help_text="Unit of measurement"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Stage 14: Full Inventory Management
    stock_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Current stock quantity"
    )
    reorder_point = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Alert threshold for low stock"
    )
    reorder_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Suggested quantity to reorder"
    )

    class Meta:
        ordering = ["name"]
        unique_together = ["company", "name"]
        verbose_name = "Part"
        verbose_name_plural = "Parts"
        indexes = [
            models.Index(fields=["company", "is_active", "stock_quantity"], name="part_co_active_stock_idx"),
        ]

    def __str__(self):
        if self.sku:
            return f"{self.name} ({self.sku})"
        return self.name

    @property
    def is_low_stock(self) -> bool:
        """Check if stock is below reorder point."""
        return self.stock_quantity <= self.reorder_point and self.reorder_point > 0

    @property
    def stock_status(self) -> str:
        """Return stock status: ok, low, out."""
        if self.stock_quantity <= 0:
            return "out"
        if self.is_low_stock:
            return "low"
        return "ok"


class StockAdjustment(models.Model):
    """
    Track stock level changes for parts.

    Stage 14: Full Inventory Management
    """

    ADJUSTMENT_IN = "in"
    ADJUSTMENT_OUT = "out"
    ADJUSTMENT_CORRECTION = "correction"

    ADJUSTMENT_TYPE_CHOICES = [
        (ADJUSTMENT_IN, "Stock In"),
        (ADJUSTMENT_OUT, "Stock Out"),
        (ADJUSTMENT_CORRECTION, "Correction"),
    ]

    part = models.ForeignKey(
        Part,
        on_delete=models.CASCADE,
        related_name="stock_adjustments"
    )
    adjustment_type = models.CharField(
        max_length=20,
        choices=ADJUSTMENT_TYPE_CHOICES
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Positive value for adjustment amount"
    )
    quantity_before = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Stock quantity before adjustment"
    )
    quantity_after = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Stock quantity after adjustment"
    )
    reason = models.CharField(
        max_length=200,
        blank=True,
        help_text="Reason for adjustment"
    )
    reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference (e.g., PO number, visit ID)"
    )
    adjusted_at = models.DateTimeField(auto_now_add=True)
    adjusted_by = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_adjustments"
    )

    class Meta:
        ordering = ["-adjusted_at"]
        verbose_name = "Stock Adjustment"
        verbose_name_plural = "Stock Adjustments"

    def __str__(self):
        return f"{self.part.name} {self.adjustment_type} {self.quantity}"


class VisitPart(models.Model):
    """
    Parts used on a specific service visit.

    Links Job to Part with quantity.
    No inventory deduction in Lite version - just tracking.

    See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 7)
    """

    job = models.ForeignKey(
        'apps_jobs.Job',
        on_delete=models.CASCADE,
        related_name="used_parts"
    )
    part = models.ForeignKey(
        Part,
        on_delete=models.PROTECT,
        related_name="usage_records"
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
        help_text="Quantity used"
    )
    notes = models.CharField(
        max_length=200,
        blank=True,
        help_text="Optional notes about this part usage"
    )
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="added_visit_parts"
    )

    class Meta:
        ordering = ["-added_at"]
        verbose_name = "Visit Part"
        verbose_name_plural = "Visit Parts"
        indexes = [
            models.Index(fields=["job", "part"], name="visitpart_job_part_idx"),
        ]

    def __str__(self):
        return f"{self.part.name} x{self.quantity} on Job #{self.job_id}"


# =============================================================================
# Stage 15: Asset Documents
# =============================================================================

def asset_document_upload_path(instance, filename):
    """
    Generate upload path for asset documents.
    Format: assets/documents/{company_id}/{asset_id}/{filename}
    """
    return f"assets/documents/{instance.asset.company_id}/{instance.asset_id}/{filename}"


class AssetDocument(models.Model):
    """
    Document attached to an asset.

    Supports PDFs, images, and other file types.
    Used for manuals, certificates, warranties, inspection reports.

    See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 15)
    """

    # Document type choices
    TYPE_MANUAL = "manual"
    TYPE_WARRANTY = "warranty"
    TYPE_CERTIFICATE = "certificate"
    TYPE_INSPECTION = "inspection"
    TYPE_PHOTO = "photo"
    TYPE_OTHER = "other"

    TYPE_CHOICES = [
        (TYPE_MANUAL, "Manual"),
        (TYPE_WARRANTY, "Warranty Document"),
        (TYPE_CERTIFICATE, "Certificate"),
        (TYPE_INSPECTION, "Inspection Report"),
        (TYPE_PHOTO, "Photo"),
        (TYPE_OTHER, "Other"),
    ]

    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="documents"
    )
    name = models.CharField(
        max_length=200,
        help_text="Document name or title"
    )
    document_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_OTHER
    )
    file = models.FileField(
        upload_to=asset_document_upload_path,
        help_text="Uploaded file (PDF, image, etc.)"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description or notes"
    )
    file_size = models.PositiveIntegerField(
        default=0,
        help_text="File size in bytes"
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        help_text="MIME type of the file"
    )

    # Audit
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        'apps_accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_asset_documents"
    )

    class Meta:
        ordering = ["-uploaded_at"]
        verbose_name = "Asset Document"
        verbose_name_plural = "Asset Documents"

    def __str__(self):
        return f"{self.name} ({self.asset.name})"

    def save(self, *args, **kwargs):
        # Auto-populate file_size and mime_type on save
        if self.file:
            self.file_size = self.file.size
            # Try to determine MIME type
            import mimetypes
            mime, _ = mimetypes.guess_type(self.file.name)
            self.mime_type = mime or "application/octet-stream"
        super().save(*args, **kwargs)
