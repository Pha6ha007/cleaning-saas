from datetime import timedelta

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone
from django.apps import apps  # 👈 добавлено для доступа к Job через apps.get_model


class Company(models.Model):
    """
    Таблица companies.
    """

    name = models.CharField(max_length=100)

    logo = models.ImageField(
        upload_to="company_logos/",
        null=True,
        blank=True,
    )

    logo_url = models.TextField(null=True, blank=True)
    contact_email = models.EmailField(max_length=255, null=True, blank=True)
    contact_phone = models.CharField(max_length=20, null=True, blank=True)

    default_work_start_time = models.TimeField(default="08:00:00")
    default_work_end_time = models.TimeField(default="17:00:00")

    notification_email = models.EmailField(max_length=255, null=True, blank=True)
    notification_enabled = models.BooleanField(default=False)
    ramadan_mode_enabled = models.BooleanField(default=False)

    # Управление активностью компании
    is_active = models.BooleanField(
        default=True,
        help_text="Если False — компания в read-only режиме (нет новых действий).",
    )
    suspended_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Когда компанию перевели в suspended (для ручного контроля).",
    )
    suspended_reason = models.CharField(
        max_length=255,
        blank=True,
        help_text="Короткая причина блокировки (видна только в админке).",
    )

    # -------- TRIAL / PLAN STATUS --------
    # `plan` - subscription state (trial, active, blocked)

    PLAN_TRIAL = "trial"
    PLAN_ACTIVE = "active"
    PLAN_BLOCKED = "blocked"

    PLAN_CHOICES = (
        (PLAN_TRIAL, "Trial"),
        (PLAN_ACTIVE, "Active"),
        (PLAN_BLOCKED, "Blocked"),
    )

    plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        default=PLAN_ACTIVE,  # все текущие компании остаются активными
    )
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_expires_at = models.DateTimeField(null=True, blank=True)

    # -------- PLAN TIER --------
    # `plan_tier` - actual pricing tier (standard, pro, enterprise)

    TIER_STANDARD = "standard"
    TIER_PRO = "pro"
    TIER_ENTERPRISE = "enterprise"

    TIER_CHOICES = (
        (TIER_STANDARD, "Standard"),
        (TIER_PRO, "Pro"),
        (TIER_ENTERPRISE, "Enterprise"),
    )

    plan_tier = models.CharField(
        max_length=20,
        choices=TIER_CHOICES,
        default=TIER_STANDARD,
        help_text="Pricing tier: standard ($29), pro ($79), enterprise ($199)",
    )

    # -------- timestamps --------

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "companies"

    def __str__(self) -> str:
        return self.name

    # ---- Trial limits ----

    # Жёстко зашитые лимиты trial
    TRIAL_MAX_CLEANERS = 2
    TRIAL_MAX_JOBS = 10

    @property
    def is_trial(self) -> bool:
        return self.plan == self.PLAN_TRIAL

    @property
    def is_trial_active(self) -> bool:
        """
        Trial считается активным только если:
        - company в плане trial
        - есть даты начала/окончания
        - текущий момент между ними
        """
        if not self.is_trial or not self.trial_started_at or not self.trial_expires_at:
            return False

        now = timezone.now()
        return self.trial_started_at <= now <= self.trial_expires_at

    def trial_days_left(self) -> int | None:
        """
        Сколько дней осталось до конца trial.
        Нужен будет для строки на dashboard.
        """
        if not self.is_trial_active:
            return None

        delta = self.trial_expires_at.date() - timezone.now().date()
        return max(delta.days, 0)

    def trial_cleaners_limit_reached(self) -> bool:
        """
        True, если на trial достигнут лимит по числу клинеров.
        """
        if not self.is_trial_active:
            return False

        # related_name="users" уже есть
        return (
            self.users.filter(role="cleaner", is_active=True).count()
            >= self.TRIAL_MAX_CLEANERS
        )

    def trial_jobs_limit_reached(self) -> bool:
        """
        True, если на trial достигнут лимит по числу jobs.
        """
        if not self.is_trial_active:
            return False

        # Импортируем здесь, чтобы не ловить циклические импорты при загрузке моделей
        from apps.jobs.models import Job

        return Job.objects.filter(company=self).count() >= self.TRIAL_MAX_JOBS

    # -------- helpers (совместимость с существующей логикой) --------

    def is_trial_expired(self) -> bool:
        """
        Истёк ли trial:
        - компания в trial-плане
        - есть дата окончания
        - now >= trial_expires_at
        """
        if not self.is_trial:
            return False
        if not self.trial_expires_at:
            return False
        return timezone.now() >= self.trial_expires_at

    def is_blocked(self) -> bool:
        """
        Компания заблокирована, если:
        - явно выключена (is_active = False)
        - план = blocked
        - или trial истёк
        """
        # ручная блокировка (manual commercial mode)
        if not self.is_active:
            return True

        # системная блокировка планом
        if self.plan == self.PLAN_BLOCKED:
            return True

        # истёкший trial
        return self.is_trial_expired()

    def start_standard_trial(self, days: int = 7) -> None:
        """
        Идёмпотентный старт trial.
        Без перезапуска истёкших trial и без влияния на active компании.
        """
        now = timezone.now()

        # Уже активная (платная) — не трогаем
        if self.plan == self.PLAN_ACTIVE:
            return

        # Trial уже был и истёк — не перезапускаем автоматически
        if self.is_trial_expired():
            return

        self.plan = self.PLAN_TRIAL
        self.trial_started_at = now
        self.trial_expires_at = now + timedelta(days=days)
        self.save(update_fields=["plan", "trial_started_at", "trial_expires_at"])

    def upgrade_to_active(self, tier: str | None = None) -> None:
        """
        Апгрейд с trial на active (платный) план.
        Опционально можно указать tier (standard, pro, enterprise).
        Идёмпотентно: если уже active — только обновляем tier при необходимости.
        """
        update_fields = []

        if self.plan != self.PLAN_ACTIVE:
            self.plan = self.PLAN_ACTIVE
            update_fields.append("plan")

        # Update tier if provided
        if tier and tier in [self.TIER_STANDARD, self.TIER_PRO, self.TIER_ENTERPRISE]:
            if self.plan_tier != tier:
                self.plan_tier = tier
                update_fields.append("plan_tier")

        if update_fields:
            self.save(update_fields=update_fields)

    # --- Suspension helpers ---

    def suspend(self, reason: str = ""):
        """
        Перевести компанию в suspended/read-only состояние.
        """
        self.is_active = False
        self.suspended_at = timezone.now()
        self.suspended_reason = reason[:255]
        self.save(update_fields=["is_active", "suspended_at", "suspended_reason"])


class Branch(models.Model):
    """
    M005/S01: Branch within a Company.

    Hierarchy: Company → Branch → Location → Job

    Enterprise-only feature: companies on TIER_ENTERPRISE can have multiple
    branches. Standard/Pro companies can have exactly one branch (or none).

    A branch has an optional manager (User with ROLE_MANAGER) who is scoped
    to see only locations and jobs belonging to their branch.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="branches",
    )

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Optional branch manager — scoped access to this branch only
    # SET_NULL so deleting a user doesn't cascade-delete the branch
    manager = models.ForeignKey(
        "apps_accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_branches",
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = "apps_accounts"
        db_table = "branches"
        unique_together = [("company", "name")]
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.company.name})"


class UserManager(BaseUserManager):
    """
    Кастомный менеджер для users.
    """

    def _create_user(self, email, phone, password, **extra_fields):
        role = extra_fields.get("role")

        if role == "manager" and not email:
            raise ValueError("Manager must have an email")
        if role == "cleaner" and not phone:
            raise ValueError("Cleaner must have a phone")

        email = self.normalize_email(email) if email else None
        user = self.model(email=email, phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email=None, phone=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        if "role" not in extra_fields:
            extra_fields["role"] = "cleaner"
        return self._create_user(email, phone, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", "manager")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email=email, phone=None, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Таблица users.
    """

    ROLE_OWNER = "owner"
    ROLE_MANAGER = "manager"
    ROLE_STAFF = "staff"
    ROLE_CLEANER = "cleaner"
    ROLE_CUSTOMER = "customer"  # Stage 16: Customer Portal

    ROLE_CHOICES = [
        (ROLE_OWNER, "Owner"),
        (ROLE_MANAGER, "Manager"),
        (ROLE_STAFF, "Staff"),
        (ROLE_CLEANER, "Cleaner"),
        (ROLE_CUSTOMER, "Customer"),  # Stage 16: Customer Portal
    ]

    AUTH_TYPE_PASSWORD = "password"
    AUTH_TYPE_SSO = "sso"

    AUTH_TYPE_CHOICES = [
        (AUTH_TYPE_PASSWORD, "Password"),
        (AUTH_TYPE_SSO, "SSO"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="users",
    )

    # M005/S01: Optional branch assignment — used for branch-scoped manager access
    branch = models.ForeignKey(
        "apps_accounts.Branch",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    # Django будет использовать это поле как password,
    # но в БД колонка называется password_hash, как в схеме.
    password = models.CharField(
        max_length=255,
        db_column="password_hash",
        blank=True,
    )

    pin_hash = models.CharField(max_length=255, null=True, blank=True)

    full_name = models.CharField(max_length=100)
    photo_url = models.TextField(null=True, blank=True)

    # Auth type: password or SSO
    auth_type = models.CharField(
        max_length=20,
        choices=AUTH_TYPE_CHOICES,
        default=AUTH_TYPE_PASSWORD,
        help_text="Authentication method: password or SSO"
    )

    # Notification preferences (user-scope)
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="User notification settings: email_notifications, job_assignment_alerts, weekly_summary"
    )

    # Password reset lifecycle
    must_change_password = models.BooleanField(
        default=False,
        help_text="User must change password on next login (set after reset-access)"
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    # Stage 16: Customer Portal - locations customer can access
    # Only used when role=customer
    customer_locations = models.ManyToManyField(
        "apps_locations.Location",
        blank=True,
        related_name="customer_users",
        help_text="Locations this customer can access (only for role=customer)"
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "users"
        constraints = [
            models.CheckConstraint(
                check=models.Q(role__in=["owner", "manager", "staff", "cleaner", "customer"]),
                name="users_role_valid",
            ),
        ]

    def __str__(self) -> str:
        return self.full_name or (self.email or self.phone or f"User {self.pk}")

    def get_notification_preferences(self):
        """
        Get notification preferences with defaults.
        """
        defaults = {
            "email_notifications": True,
            "job_assignment_alerts": True,
            "weekly_summary": False,
        }
        if not self.notification_preferences:
            return defaults
        return {**defaults, **self.notification_preferences}

    def update_notification_preferences(self, **kwargs):
        """
        Update notification preferences.
        """
        current = self.get_notification_preferences()
        current.update(kwargs)
        self.notification_preferences = current
        self.save(update_fields=["notification_preferences", "updated_at"])

    # Stage 16: Customer Portal helpers
    @property
    def is_customer(self) -> bool:
        """Check if user is a customer."""
        return self.role == self.ROLE_CUSTOMER

    def get_accessible_location_ids(self) -> list[int]:
        """
        Get IDs of locations this user can access.
        For customers: only assigned locations.
        For others: all company locations.
        """
        if self.is_customer:
            return list(self.customer_locations.values_list("id", flat=True))
        # Non-customers can access all company locations
        return list(self.company.locations.filter(is_active=True).values_list("id", flat=True))


# =============================================================================
# Paddle Billing Models (M001-sijc46: Launch-Ready Billing & Auth)
# =============================================================================


class PaddleSubscription(models.Model):
    """
    One per company. Tracks current Paddle subscription state.

    Updated by webhook handlers when Paddle delivers subscription events.
    Used by BillingSubscriptionView to show real subscription data.
    """

    STATUS_ACTIVE = "active"
    STATUS_CANCELED = "canceled"
    STATUS_PAST_DUE = "past_due"
    STATUS_PAUSED = "paused"
    STATUS_TRIALING = "trialing"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_CANCELED, "Canceled"),
        (STATUS_PAST_DUE, "Past Due"),
        (STATUS_PAUSED, "Paused"),
        (STATUS_TRIALING, "Trialing"),
    ]

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="paddle_subscription",
    )
    paddle_subscription_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Paddle subscription ID (sub_xxx)",
    )
    paddle_customer_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Paddle customer ID (ctm_xxx)",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    plan_tier = models.CharField(
        max_length=20,
        blank=True,
        help_text="Pricing tier derived from Paddle price ID: standard/pro/enterprise",
    )
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    paddle_update_url = models.URLField(
        blank=True,
        help_text="URL for customer to update payment method",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "paddle_subscriptions"

    def __str__(self) -> str:
        return f"PaddleSubscription({self.company.name}, {self.paddle_subscription_id}, {self.status})"


class PaddleWebhookEvent(models.Model):
    """
    Audit log of every Paddle webhook event received.

    Every event is persisted before processing — provides full audit trail,
    enables replay debugging, and is the basis for idempotency (dedup by event_id).
    """

    STATUS_PENDING = "pending"
    STATUS_PROCESSED = "processed"
    STATUS_SKIPPED = "skipped"    # Out-of-order event, not applied
    STATUS_FAILED = "failed"       # Handler raised exception

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSED, "Processed"),
        (STATUS_SKIPPED, "Skipped"),
        (STATUS_FAILED, "Failed"),
    ]

    event_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Paddle event ID (evt_xxx) — used for deduplication",
    )
    event_type = models.CharField(
        max_length=100,
        help_text="Paddle event type (e.g. subscription.activated)",
    )
    payload = models.JSONField(
        help_text="Full raw Paddle webhook payload JSON",
    )
    occurred_at = models.DateTimeField(
        help_text="When the event occurred (from Paddle payload)",
    )
    received_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When we received the webhook",
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When we finished processing the event",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    error_message = models.TextField(
        blank=True,
        help_text="Exception text if status=failed",
    )

    class Meta:
        db_table = "paddle_webhook_events"
        indexes = [
            models.Index(fields=["event_type", "status"]),
            models.Index(fields=["occurred_at"]),
        ]

    def __str__(self) -> str:
        return f"PaddleWebhookEvent({self.event_type}, {self.event_id}, {self.status})"


# =============================================================================
# M004/S02: Email Verification Token
# =============================================================================

import uuid as _uuid


class EmailVerificationToken(models.Model):
    """
    Single-use email verification token for new signups.

    Created when a new owner registers via ManagerSignupView.
    Verified via GET /api/auth/verify-email/?token=<uuid>.

    On successful verification:
    - user.is_active is set to True (was False until verified)
    - company.plan is set to "trial" with trial_started_at/expires_at set to 7 days

    Token expires after 24 hours. Single-use: deleted after successful verification.
    """

    TOKEN_TTL_HOURS = 24
    TRIAL_DAYS = 7

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="email_verification_token",
    )
    token = models.UUIDField(default=_uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_verification_tokens"
        verbose_name = "Email Verification Token"
        verbose_name_plural = "Email Verification Tokens"

    def __str__(self):
        return f"VerifyToken({self.user.email}, {'expired' if self.is_expired else 'valid'})"

    @property
    def is_expired(self) -> bool:
        from django.utils import timezone as tz
        from datetime import timedelta
        return tz.now() > self.created_at + timedelta(hours=self.TOKEN_TTL_HOURS)

    def verify(self) -> bool:
        """
        Verify the token: activate user, start trial, delete token.
        Returns True on success, False if already expired.
        """
        from django.utils import timezone as tz
        from datetime import timedelta

        if self.is_expired:
            return False

        user = self.user
        company = user.company

        # Activate user
        user.is_active = True
        user.save(update_fields=["is_active"])

        # Start 7-day trial
        now = tz.now()
        company.plan = Company.PLAN_TRIAL
        company.trial_started_at = now
        company.trial_expires_at = now + timedelta(days=self.TRIAL_DAYS)
        company.save(update_fields=["plan", "trial_started_at", "trial_expires_at"])

        # Seed default data (checklists etc.)
        try:
            from apps.api.seed_helpers import seed_default_checklists
            seed_default_checklists(company)
        except Exception:
            pass  # Non-fatal — company still activated

        # Delete token (single-use)
        self.delete()
        return True
