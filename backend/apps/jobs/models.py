# backend/apps/jobs/models.py
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.accounts.models import Company, User
from apps.locations.models import Location, ChecklistTemplate
# Note: Asset import deferred to avoid circular import - see asset FK below


class Job(models.Model):
    """
    Уборка на конкретной локации, в конкретный день, за конкретным клинером.

    Context field determines which product context this job belongs to:
    - "cleaning": Standard cleaning jobs (CleanProof)
    - "maintenance": Service visits (MaintainProof)
    """

    # Context choices - determines which product this job belongs to
    CONTEXT_CLEANING = "cleaning"
    CONTEXT_MAINTENANCE = "maintenance"

    CONTEXT_CHOICES = [
        (CONTEXT_CLEANING, "Cleaning"),
        (CONTEXT_MAINTENANCE, "Maintenance"),
    ]

    STATUS_SCHEDULED = "scheduled"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_COMPLETED_UNVERIFIED = "completed_unverified"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_IN_PROGRESS, "In progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_COMPLETED_UNVERIFIED, "Completed (Unverified)"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    # Priority choices (Stage 4: SLA & Priority Layer)
    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="jobs",
    )

    # Context separation: cleaning vs maintenance
    # IMPORTANT: Context separation MUST NOT rely on asset nullability
    context = models.CharField(
        max_length=32,
        choices=CONTEXT_CHOICES,
        default=CONTEXT_CLEANING,
        db_index=True,
        help_text="Product context: cleaning (CleanProof) or maintenance (MaintainProof)",
    )

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="jobs",
    )

    cleaner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="jobs",
    )

    checklist_template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )

    # Maintenance Context V1: optional asset link for service visits
    # See: docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md Section 4.2
    asset = models.ForeignKey(
        "apps_maintenance.Asset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
        help_text="Optional link to asset for maintenance service visits",
    )

    # Maintenance Context V1: optional category for service visits
    maintenance_category = models.ForeignKey(
        "apps_maintenance.MaintenanceCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
        help_text="Optional category for maintenance service visits (e.g., Preventive, Corrective)",
    )

    # Stage 4: Priority & SLA Layer
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_LOW,
        db_index=True,
        help_text="Priority level: low, medium, high",
    )
    sla_deadline = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Deadline for SLA compliance. Visual timer shows time remaining.",
    )

    # M005/S03: Per-job SLA policy override
    sla_policy_override = models.ForeignKey(
        "apps_jobs.SLAPolicy",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="job_overrides",
        help_text="Override SLA policy for this specific job. Falls back to location → company default.",
    )

    scheduled_date = models.DateField(db_index=True)
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)

    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_SCHEDULED,
        db_index=True,
    )

    manager_notes = models.TextField(blank=True)
    cleaner_notes = models.TextField(blank=True)

    # Force-complete audit fields (AUDIT FIX: Critical Risk #4)
    verification_override = models.BooleanField(
        default=False,
        help_text="True if job was force-completed without full proof verification",
    )
    force_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when manager force-completed this job",
    )
    force_completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="force_completed_jobs",
        help_text="Manager who force-completed this job",
    )
    force_complete_reason = models.TextField(
        blank=True,
        help_text="Reason provided by manager for force-completing this job",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jobs"
        indexes = [
            models.Index(fields=['company', 'status', 'actual_end_time'], name='jobs_co_status_endtime_idx'),
            models.Index(fields=['company', 'context', 'status'], name='jobs_co_ctx_status_idx'),
        ]

    def __str__(self) -> str:
        return f"Job #{self.id} – {self.location} – {self.scheduled_date}"

    def clean(self):
        # AUDIT FIX: Medium Risk #11 - validate scheduled_end_time
        if self.scheduled_start_time and self.scheduled_end_time:
            if self.scheduled_end_time <= self.scheduled_start_time:
                raise ValidationError(
                    {"scheduled_end_time": "scheduled_end_time must be after scheduled_start_time"}
                )

        # Шаблон чеклиста должен быть из той же компании, что и job
        if self.checklist_template and self.company_id:
            if self.checklist_template.company_id != self.company_id:
                raise ValidationError("Checklist template must belong to the same company as the job")

    def _get_template_items_qs(self):
        """
        Пытаемся найти связанные пункты шаблона чеклиста, не зная точный related_name.
        Поддерживаем несколько вариантов, чтобы не утыкаться в странный related_name.
        """
        template = self.checklist_template
        if template is None:
            return None

        # самые вероятные варианты
        candidates = [
            "items",
            "template_items",
            "checklist_items",
            "checklisttemplateitem_set",
        ]

        for attr in candidates:
            if hasattr(template, attr):
                qs = getattr(template, attr)
                try:
                    # manager / related manager
                    return qs.all()
                except Exception:
                    continue

        print(f"[Job.save] No related items manager found on ChecklistTemplate(id={template.id})")
        return None

    def save(self, *args, **kwargs):
        """
        ВАЖНО для MVP:
        - Django admin создаёт Job через обычный save()
        - create_with_checklist() может не использоваться
        Поэтому: если у Job есть checklist_template и нет checklist_items,
        автоматически делаем snapshot в JobChecklistItem.
        """
        is_new = self.pk is None

        super().save(*args, **kwargs)

        # Если шаблон не задан — нечего снимать
        if not self.checklist_template_id:
            return

        # Уже есть checklist_items — ничего не делаем
        if self.checklist_items.exists():
            return

        # На всякий случай ещё раз проверим company
        if self.company_id and self.checklist_template.company_id != self.company_id:
            print(
                f"[Job.save] ChecklistTemplate(id={self.checklist_template_id}) "
                f"company mismatch for Job(id={self.id})"
            )
            return

        items_qs = self._get_template_items_qs()
        if items_qs is None:
            print(f"[Job.save] No template items for checklist_template={self.checklist_template_id}")
            return

        with transaction.atomic():
            created_count = 0
            for item in items_qs:
                order_val = getattr(item, "order", None)
                if order_val is None:
                    order_val = getattr(item, "order_index", 1)

                is_required_val = getattr(item, "is_required", True)

                JobChecklistItem.objects.create(
                    job=self,
                    order=int(order_val),
                    text=item.text,
                    is_required=bool(is_required_val),
                )
                created_count += 1

        print(
            f"[Job.save] Created {created_count} checklist items for Job(id={self.id}), "
            f"template={self.checklist_template_id}"
        )

    @classmethod
    def create_with_checklist(
        cls,
        *,
        company: Company,
        location: Location,
        cleaner: User,
        scheduled_date,
        scheduled_start_time=None,
        scheduled_end_time=None,
        checklist_template: ChecklistTemplate | None = None,
        manager_notes: str = "",
    ) -> "Job":
        """
        Создаёт Job и копирует пункты checklist_template в JobChecklistItem.
        Теперь snapshot гарантирован в save(), но метод оставляем
        для явного использования из API/сервисов.
        """
        with transaction.atomic():
            job = cls.objects.create(
                company=company,
                location=location,
                cleaner=cleaner,
                checklist_template=checklist_template,
                scheduled_date=scheduled_date,
                scheduled_start_time=scheduled_start_time,
                scheduled_end_time=scheduled_end_time,
                manager_notes=manager_notes,
            )
            return job

    def check_in(self):
        if self.status != self.STATUS_SCHEDULED:
            raise ValidationError("Job is not in scheduled state")

        self.status = self.STATUS_IN_PROGRESS
        self.actual_start_time = timezone.now()
        self.save(update_fields=["status", "actual_start_time"])

    def check_out(self):
        """
        Complete the job (check-out).

        Raises ValidationError if job cannot be completed due to:
        - Job not in 'in_progress' status
        - Missing required photos (before/after)
        - Incomplete required checklist items

        ValidationError will contain a dict mapping field names to error messages.
        """
        if self.status != self.STATUS_IN_PROGRESS:
            raise ValidationError({"status": "Job must be in 'in_progress' status to check out"})

        # Collect all blockers
        blockers = {}

        # 1) Фото до/после обязательны
        has_before = self.photos.filter(photo_type=JobPhoto.TYPE_BEFORE).exists()
        has_after = self.photos.filter(photo_type=JobPhoto.TYPE_AFTER).exists()
        if not has_before:
            blockers["photos_before"] = "Before photo is required"
        if not has_after:
            blockers["photos_after"] = "After photo is required"

        # 2) Обязательные пункты чек-листа должны быть выполнены
        required_incomplete = self.checklist_items.filter(is_required=True, is_completed=False)
        if required_incomplete.exists():
            incomplete_ids = list(required_incomplete.values_list("id", flat=True))
            blockers["checklist"] = f"Required checklist items not completed: {incomplete_ids}"

        if blockers:
            raise ValidationError(blockers)

        self.status = self.STATUS_COMPLETED
        self.actual_end_time = timezone.now()
        self.save(update_fields=["status", "actual_end_time"])


class JobCheckEvent(models.Model):
    """
    Событие check-in / check-out для job.

    AUDIT FIX: High Risk #6 - Events are immutable after creation.
    """

    TYPE_CHECK_IN = "check_in"
    TYPE_CHECK_OUT = "check_out"
    TYPE_FORCE_COMPLETE = "force_complete"

    EVENT_TYPES = (
        (TYPE_CHECK_IN, "Check-in"),
        (TYPE_CHECK_OUT, "Check-out"),
        (TYPE_FORCE_COMPLETE, "Force Complete"),
    )

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="check_events",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="job_check_events_events",
        null=True,
        blank=True,
    )

    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    distance_m = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_check_events"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.job_id} {self.event_type} at {self.created_at}"

    def save(self, *args, **kwargs):
        """
        AUDIT FIX: High Risk #6 - Make JobCheckEvent immutable.

        Events can only be created, never updated.
        This protects the audit trail from tampering.
        """
        if self.pk is not None:
            raise ValidationError(
                "JobCheckEvent records are immutable and cannot be modified after creation. "
                "Create a new event instead."
            )
        super().save(*args, **kwargs)


class JobChecklistItem(models.Model):
    """
    Снимок пункта чек-листа на момент создания задания.
    Привязан к Job (обязательно для MVP).
    """

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="checklist_items",
        null=True,
        blank=True,
    )

    order = models.PositiveIntegerField(default=1)
    text = models.CharField(max_length=255)
    is_required = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(
        auto_now_add=True,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "job_checklist_items"
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.job_id} — {self.order}. {self.text}"


# --- Photos (Phase 9) ---


class File(models.Model):
    """
    Метаданные загруженного файла.
    Хранение: file_url — источник правды (локально или S3/Spaces).
    """
    file_url = models.URLField(max_length=1000)
    original_name = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "files"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.original_name or self.file_url


class JobPhoto(models.Model):
    """
    Фото до/после уборки, привязано к Job.
    EXIF поля — если есть, сохраняем.

    V3 Phase 1.1: Photo replacement tracking for maintenance context
    """
    TYPE_BEFORE = "before"
    TYPE_AFTER = "after"

    PHOTO_TYPES = (
        (TYPE_BEFORE, "Before"),
        (TYPE_AFTER, "After"),
    )

    # Role-based replacement limits (maintenance context only)
    MAX_REPLACEMENTS_TECH = 2
    MAX_REPLACEMENTS_MANAGER = 3
    EDIT_WINDOW_TECH_MINUTES = 30
    EDIT_WINDOW_MANAGER_HOURS = 24

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="photos",
    )

    file = models.OneToOneField(
        File,
        on_delete=models.CASCADE,
        related_name="job_photo",
    )

    photo_type = models.CharField(max_length=10, choices=PHOTO_TYPES)

    # EXIF (optional)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo_timestamp = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    # V3 Phase 1.1: Replacement tracking (maintenance context only)
    # All fields nullable for backwards compatibility with cleaning context
    replacement_count = models.IntegerField(default=0)
    original_uploaded_at = models.DateTimeField(null=True, blank=True)
    last_replaced_at = models.DateTimeField(null=True, blank=True)
    last_replaced_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replaced_photos",
    )
    replacement_reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "job_photos"
        constraints = [
            models.UniqueConstraint(
                fields=["job", "photo_type"],
                name="uniq_job_photo_type",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Job {self.job_id} {self.photo_type}"

    def can_be_replaced_by(self, user, job, reason=None):
        """
        Check if photo can be replaced by this user.
        Returns (can_replace: bool, error_message: str | None)

        V3 Phase 1.1: Maintenance context only - role-based replacement limits
        """
        from django.utils import timezone

        # TECHNICIAN - Strict rules
        if user.role == User.ROLE_STAFF:
            # For first upload (replacement_count=0): anyone assigned to visit can upload
            # For replacements (replacement_count>0): only the person who last uploaded can replace
            if self.replacement_count > 0 and self.last_replaced_by and self.last_replaced_by != user:
                return False, "Can only replace photos you uploaded"

            # If first upload, must be assigned to the visit
            if self.replacement_count == 0 and job.cleaner != user:
                return False, "Can only upload photos on visits assigned to you"

            # Max 2 replacements
            if self.replacement_count >= self.MAX_REPLACEMENTS_TECH:
                return False, f"Maximum {self.MAX_REPLACEMENTS_TECH} replacements reached"

            # 30 minute window - ONLY for actual replacements, not first upload
            # If replacement_count=0, this is first upload (offline sync allowed anytime)
            if self.replacement_count > 0 and self.original_uploaded_at:
                elapsed_minutes = (
                    timezone.now() - self.original_uploaded_at
                ).total_seconds() / 60
                if elapsed_minutes > self.EDIT_WINDOW_TECH_MINUTES:
                    return (
                        False,
                        f"Edit window ({self.EDIT_WINDOW_TECH_MINUTES} minutes) expired",
                    )

            return True, None

        # MANAGER - Extended rights
        if user.role == User.ROLE_MANAGER:
            # Cannot replace on completed visits
            if job.status == Job.STATUS_COMPLETED:
                return False, "Cannot replace photos on completed visits"

            # Max 3 replacements
            if self.replacement_count >= self.MAX_REPLACEMENTS_MANAGER:
                return False, f"Maximum {self.MAX_REPLACEMENTS_MANAGER} replacements reached"

            # 24 hour window - ONLY for actual replacements, not first upload
            # If replacement_count=0, this is first upload (offline sync allowed anytime)
            if self.replacement_count > 0 and self.original_uploaded_at:
                elapsed_hours = (
                    timezone.now() - self.original_uploaded_at
                ).total_seconds() / 3600
                if elapsed_hours > self.EDIT_WINDOW_MANAGER_HOURS:
                    return (
                        False,
                        f"Edit window ({self.EDIT_WINDOW_MANAGER_HOURS} hours) expired",
                    )

            return True, None

        # OWNER - Unlimited with reason
        if user.role == User.ROLE_OWNER:
            # Must provide reason (min 10 characters)
            if not reason or len(reason.strip()) < 10:
                return False, "Reason required (minimum 10 characters)"

            return True, None

        return False, "Insufficient permissions"

    def get_time_remaining_for_edit(self, user):
        """
        Get time remaining in edit window (minutes for tech, hours for manager).
        Returns 0 if expired, 999 for owners (unlimited).
        """
        from django.utils import timezone

        if not self.original_uploaded_at:
            return 0

        elapsed_seconds = (
            timezone.now() - self.original_uploaded_at
        ).total_seconds()

        if user.role == User.ROLE_STAFF:
            elapsed_minutes = elapsed_seconds / 60
            remaining = self.EDIT_WINDOW_TECH_MINUTES - elapsed_minutes
            return max(0, int(remaining))

        if user.role == User.ROLE_MANAGER:
            elapsed_hours = elapsed_seconds / 3600
            remaining = self.EDIT_WINDOW_MANAGER_HOURS - elapsed_hours
            return max(0, int(remaining))

        # Owner has unlimited time
        return 999

    def get_replacements_remaining(self, user):
        """
        Get number of replacements remaining for this user.
        Returns 999 for owners (unlimited).
        """

        if user.role == User.ROLE_STAFF:
            return max(0, self.MAX_REPLACEMENTS_TECH - self.replacement_count)

        if user.role == User.ROLE_MANAGER:
            return max(0, self.MAX_REPLACEMENTS_MANAGER - self.replacement_count)

        # Owner has unlimited replacements
        return 999



class SLAPolicy(models.Model):
    """
    M005/S03: SLA policy for a company or location.

    Defines:
    - GPS check-in radius (metres)
    - Check-in / check-out time windows (minutes buffer)
    - Required proof elements (photo, checklist, signature)

    Hierarchy for policy lookup (get_effective_sla_policy):
        Job.sla_policy_override  →  Location.sla_policy  →  company default

    One policy per company may be flagged is_default=True. If no default
    exists, a synthetic fallback with platform defaults is returned.
    """

    DEFAULT_GPS_RADIUS_M = 100
    DEFAULT_CHECKIN_WINDOW_MINUTES = 30
    DEFAULT_CHECKOUT_WINDOW_MINUTES = 30

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="sla_policies",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # GPS radius for check-in validation (metres)
    gps_radius_m = models.PositiveIntegerField(
        default=DEFAULT_GPS_RADIUS_M,
        help_text="Allowed distance from location for check-in/check-out (metres)",
    )

    # Time window buffers (minutes before/after scheduled time)
    check_in_window_minutes = models.PositiveIntegerField(
        default=DEFAULT_CHECKIN_WINDOW_MINUTES,
        help_text="Minutes before scheduled start that check-in is allowed",
    )
    check_out_window_minutes = models.PositiveIntegerField(
        default=DEFAULT_CHECKOUT_WINDOW_MINUTES,
        help_text="Minutes after scheduled end before SLA is considered breached",
    )

    # Required proof elements
    required_proof_photo = models.BooleanField(
        default=True,
        help_text="At least one photo required for job completion",
    )
    required_proof_checklist = models.BooleanField(
        default=False,
        help_text="All checklist items must be completed",
    )
    required_proof_signature = models.BooleanField(
        default=False,
        help_text="Customer signature required",
    )

    # One default policy per company
    is_default = models.BooleanField(
        default=False,
        help_text="Use this policy when no location-specific policy is set",
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = "apps_jobs"
        db_table = "sla_policies"
        ordering = ["-is_default", "name"]

    def __str__(self) -> str:
        suffix = " [default]" if self.is_default else ""
        return f"{self.name}{suffix} ({self.company.name})"

    def save(self, *args, **kwargs):
        """Enforce single default per company: unset other defaults when is_default=True."""
        if self.is_default and self.pk:
            SLAPolicy.objects.filter(
                company=self.company, is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        elif self.is_default and not self.pk:
            # New object — will clear after save
            super().save(*args, **kwargs)
            SLAPolicy.objects.filter(
                company=self.company, is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
            return
        super().save(*args, **kwargs)


def get_effective_sla_policy(job) -> "SLAPolicy":
    """
    Return the effective SLAPolicy for a job, following the inheritance chain:
        1. job.sla_policy_override  (explicit job override)
        2. job.location.sla_policy  (location-level policy)
        3. company default policy   (is_default=True)
        4. synthetic fallback       (platform defaults, no DB record)

    Always returns a SLAPolicy-like object (never None).
    """
    # 1. Job override
    if hasattr(job, "sla_policy_override") and job.sla_policy_override_id:
        return job.sla_policy_override

    # 2. Location policy
    location = getattr(job, "location", None)
    if location and hasattr(location, "sla_policy") and location.sla_policy_id:
        return location.sla_policy

    # 3. Company default
    default = SLAPolicy.objects.filter(
        company=job.company, is_default=True
    ).first()
    if default:
        return default

    # 4. Synthetic fallback
    fallback = SLAPolicy(
        company=job.company,
        name="Platform Default",
        gps_radius_m=SLAPolicy.DEFAULT_GPS_RADIUS_M,
        check_in_window_minutes=SLAPolicy.DEFAULT_CHECKIN_WINDOW_MINUTES,
        check_out_window_minutes=SLAPolicy.DEFAULT_CHECKOUT_WINDOW_MINUTES,
        required_proof_photo=True,
        required_proof_checklist=False,
        required_proof_signature=False,
        is_default=True,
    )
    return fallback


class RecurringJobTemplate(models.Model):
    """
    M005/S02: Template for auto-generating recurring CleanProof jobs.

    Celery Beat task runs daily and creates Job instances for each
    active template whose should_run_on(today) returns True.
    """

    FREQUENCY_DAILY = "daily"
    FREQUENCY_WEEKLY = "weekly"
    FREQUENCY_MONTHLY = "monthly"

    FREQUENCY_CHOICES = [
        (FREQUENCY_DAILY, "Daily"),
        (FREQUENCY_WEEKLY, "Weekly"),
        (FREQUENCY_MONTHLY, "Monthly"),
    ]

    DOW_CHOICES = [
        (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
        (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday"),
    ]

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="recurring_job_templates",
    )
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="recurring_job_templates",
    )
    cleaner = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="recurring_job_templates",
        limit_choices_to={"role": User.ROLE_CLEANER},
    )
    checklist_template = models.ForeignKey(
        ChecklistTemplate, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="recurring_job_templates",
    )

    name = models.CharField(max_length=100)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default=FREQUENCY_WEEKLY)
    day_of_week = models.PositiveSmallIntegerField(
        null=True, blank=True, choices=DOW_CHOICES,
        help_text="WEEKLY: 0=Mon, 6=Sun",
    )
    day_of_month = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="MONTHLY: 1-28",
    )
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_generated_at = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="created_recurring_job_templates",
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = "apps_jobs"
        db_table = "recurring_job_templates"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.frequency}) - {self.location}"

    def should_run_on(self, target_date) -> bool:
        """Return True if a job should be generated on target_date."""
        if not self.is_active:
            return False
        if self.frequency == self.FREQUENCY_DAILY:
            return True
        if self.frequency == self.FREQUENCY_WEEKLY:
            return self.day_of_week is not None and target_date.weekday() == self.day_of_week
        if self.frequency == self.FREQUENCY_MONTHLY:
            return self.day_of_month is not None and target_date.day == self.day_of_month
        return False

    def generate_job_for_date(self, target_date) -> "Job":
        """Create a Job for target_date from this template."""

        assigned_cleaner = self.cleaner
        if assigned_cleaner is None:
            assigned_cleaner = User.objects.filter(
                company=self.company, role=User.ROLE_CLEANER, is_active=True
            ).first()
            if assigned_cleaner is None:
                raise ValueError(
                    f"No active cleaner for company {self.company_id}. "
                    "Assign a cleaner to the template."
                )

        job = Job.objects.create(
            company=self.company,
            location=self.location,
            cleaner=assigned_cleaner,
            checklist_template=self.checklist_template,
            context=Job.CONTEXT_CLEANING,
            status=Job.STATUS_SCHEDULED,
            scheduled_date=target_date,
            scheduled_start_time=self.scheduled_start_time,
            scheduled_end_time=self.scheduled_end_time,
            manager_notes=f"Auto-generated from schedule: {self.name}",
        )
        # Note: Job.save() auto-copies checklist items from checklist_template
        # No need to copy here — would create duplicates.

        self.last_generated_at = target_date
        self.save(update_fields=["last_generated_at", "updated_at"])
        return job
