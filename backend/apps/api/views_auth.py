# backend/apps/api/views_auth.py

from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import Company, User


class LoginView(APIView):
    """
    MVP Login.
    Авторизация по email + password (cleaner).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip()
        password = (request.data.get("password") or "")

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 🔴 ВАЖНО: тут убираем фильтр по role
        try:
            user = User.objects.get(
                email__iexact=email,
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user must change password
        if user.must_change_password:
            return Response(
                {
                    "code": "PASSWORD_CHANGE_REQUIRED",
                    "message": "Password change required.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )


class CleanerPinLoginView(APIView):
    """
    Login для клинера по phone + PIN.
    Используется мобильным приложением.
    """

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AnonRateThrottle]

    def post(self, request, *args, **kwargs):
        phone = (request.data.get("phone") or "").strip()
        pin = request.data.get("pin") or ""

        if not phone or not pin:
            return Response(
                {"detail": "Phone and PIN are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(
                phone=phone,
                role=User.ROLE_CLEANER,
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.pin_hash:
            return Response(
                {"detail": "PIN login is not configured for this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_password(str(pin), user.pin_hash):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user must change password
        if user.must_change_password:
            return Response(
                {
                    "code": "PASSWORD_CHANGE_REQUIRED",
                    "message": "Password change required.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )


class ManagerLoginView(APIView):
    """
    Login для менеджера (web dashboard).
    """

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(
                email__iexact=email,
                role__in=[User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF],
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if user must change password
        if user.must_change_password:
            return Response(
                {
                    "code": "PASSWORD_CHANGE_REQUIRED",
                    "message": "Password change required.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )


class ManagerSignupView(APIView):
    """
    Public signup endpoint.

    Создаёт новую компанию + первого пользователя (Owner).
    Не требует аутентификации.

    IMPORTANT: First user of a company is always Owner (Billing Admin).
    """

    authentication_classes: list = []
    permission_classes: list = []
    throttle_classes = [AnonRateThrottle]

    def post(self, request, *args, **kwargs):
        company_name = (request.data.get("company_name") or "").strip()
        full_name = (request.data.get("full_name") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        errors: dict[str, list[str]] = {}

        if not company_name:
            errors.setdefault("company_name", []).append("This field is required.")
        if not full_name:
            errors.setdefault("full_name", []).append("This field is required.")
        if not email:
            errors.setdefault("email", []).append("This field is required.")
        if not password:
            errors.setdefault("password", []).append("This field is required.")

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Check email uniqueness among all console users (owner, manager, staff)
        if User.objects.filter(
            email__iexact=email,
            role__in=[User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF],
        ).exists():
            return Response(
                {"email": ["A user with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create company
        company = Company.objects.create(
            name=company_name,
            contact_email=email,
        )

        # Create first user as OWNER (not manager)
        # Owner = Billing Admin, has full control over company
        owner = User.objects.create(
            company=company,
            role=User.ROLE_OWNER,  # First user is always Owner
            email=email,
            full_name=full_name,
            is_active=True,
        )

        # Validate password strength before setting
        try:
            validate_password(password, user=owner)
        except DjangoValidationError as e:
            # Rollback: delete the user and company we just created
            owner.delete()
            company.delete()
            return Response(
                {"code": "weak_password", "message": "Password too weak.", "fields": {"password": list(e.messages)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        owner.set_password(password)
        owner.save(update_fields=["password"])

        # M004/S02: Email verification
        # Skip deactivation if SKIP_EMAIL_VERIFICATION is set (no SMTP configured)
        import os as _os
        skip_verification = _os.environ.get("SKIP_EMAIL_VERIFICATION", "").lower() in ("true", "1", "yes")

        if not skip_verification:
            owner.is_active = False
            owner.save(update_fields=["is_active"])

            from apps.accounts.models import EmailVerificationToken
            verification = EmailVerificationToken.objects.create(user=owner)
            _send_verification_email(owner, company, str(verification.token))
        # else: user stays is_active=True, can login immediately

        data = {
            "status": "verification_pending",
            "message": "Account created. Please check your email to verify your address and activate your account.",
            "company": {
                "id": company.id,
                "name": company.name,
            },
            "user": {
                "id": owner.id,
                "email": owner.email,
                "full_name": owner.full_name,
                "role": owner.role,
            },
        }
        return Response(data, status=status.HTTP_201_CREATED)


def _send_verification_email(user, company, token: str) -> None:
    """Send verification email to newly registered owner. Non-fatal."""
    from django.core.mail import send_mail
    from django.conf import settings
    import logging

    logger = logging.getLogger(__name__)
    try:
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        verify_url = f"{base_url}/verify-email?token={token}"
        subject = "Verify your MaintainProof account"
        body = (
            f"Hello {user.full_name},\n\n"
            f"Welcome to MaintainProof! Please verify your email address to activate "
            f"your account and start your 7-day free trial.\n\n"
            f"Click here to verify:\n{verify_url}\n\n"
            f"This link expires in 24 hours.\n\n"
            f"— The MaintainProof Team"
        )
        from_email = getattr(settings, "EMAIL_HOST_USER", "noreply@maintainproof.com")
        send_mail(subject, body, from_email, [user.email], fail_silently=True)
        logger.info("Verification email sent to %s", user.email)
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", user.email, exc)


class EmailVerifyView(APIView):
    """
    Email verification endpoint.

    GET /api/auth/verify-email/?token=<uuid>

    On success:
    - User is activated (is_active = True)
    - Company trial starts (7-day, plan = "trial")
    - Token is deleted (single-use)
    - Returns 200 with user + company data

    On failure:
    - 400 if token is missing, invalid, or expired
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        token_str = request.query_params.get("token", "").strip()

        if not token_str:
            return Response(
                {"code": "TOKEN_MISSING", "message": "Verification token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate UUID format
        import uuid
        try:
            token_uuid = uuid.UUID(token_str)
        except ValueError:
            return Response(
                {"code": "TOKEN_INVALID", "message": "Invalid verification token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.accounts.models import EmailVerificationToken
        try:
            verification = EmailVerificationToken.objects.select_related(
                "user", "user__company"
            ).get(token=token_uuid)
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"code": "TOKEN_INVALID", "message": "Invalid or already used verification token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification.is_expired:
            verification.delete()
            return Response(
                {
                    "code": "TOKEN_EXPIRED",
                    "message": "Verification link has expired. Please sign up again.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = verification.user
        company = user.company

        # Verify and activate
        verification.verify()

        return Response(
            {
                "status": "verified",
                "message": "Email verified successfully. Your 7-day trial has started.",
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "plan": Company.PLAN_TRIAL,
                    "trial_days": EmailVerificationToken.TRIAL_DAYS,
                },
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


class ResendVerificationView(APIView):
    """
    Resend verification email.

    POST /api/auth/resend-verification/
    Body: {"email": "user@example.com"}

    Rate limited: max 3 requests per email per hour.
    Always returns 200 to prevent email enumeration.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip().lower()

        if not email:
            # Always return 200 to prevent enumeration
            return Response(
                {"message": "If an account with that email exists, we've sent a new verification link."},
                status=status.HTTP_200_OK,
            )

        from apps.accounts.models import User, EmailVerificationToken
        try:
            user = User.objects.get(email=email, is_active=False)
        except User.DoesNotExist:
            # Don't reveal whether email exists
            return Response(
                {"message": "If an account with that email exists, we've sent a new verification link."},
                status=status.HTTP_200_OK,
            )

        # Delete old tokens and create a new one
        EmailVerificationToken.objects.filter(user=user).delete()
        verification = EmailVerificationToken.objects.create(user=user)
        _send_verification_email(user, user.company, str(verification.token))

        return Response(
            {"message": "If an account with that email exists, we've sent a new verification link."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """
    Request a password reset email.

    POST /api/auth/password-reset/
    Body: {"email": "user@example.com"}

    Always returns 200 to prevent email enumeration.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip().lower()

        if not email:
            return Response(
                {"message": "If an account with that email exists, we've sent a password reset link."},
                status=status.HTTP_200_OK,
            )

        from apps.accounts.models import User
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"message": "If an account with that email exists, we've sent a password reset link."},
                status=status.HTTP_200_OK,
            )

        # Generate reset token
        from apps.accounts.models import PasswordResetToken
        PasswordResetToken.objects.filter(user=user).delete()
        reset_token = PasswordResetToken.objects.create(user=user)

        _send_password_reset_email(user, str(reset_token.token))

        return Response(
            {"message": "If an account with that email exists, we've sent a password reset link."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.

    POST /api/auth/password-reset/confirm/
    Body: {"token": "<uuid>", "password": "<new_password>"}
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        import uuid
        token_str = (request.data.get("token") or "").strip()
        new_password = request.data.get("password", "")

        if not token_str or not new_password:
            return Response(
                {"code": "MISSING_FIELDS", "message": "Token and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_uuid = uuid.UUID(token_str)
        except ValueError:
            return Response(
                {"code": "TOKEN_INVALID", "message": "Invalid reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.accounts.models import PasswordResetToken
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(token=token_uuid)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"code": "TOKEN_INVALID", "message": "Invalid or already used reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reset_token.is_expired:
            reset_token.delete()
            return Response(
                {"code": "TOKEN_EXPIRED", "message": "Reset link has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user

        # Validate password
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response(
                {"code": "WEAK_PASSWORD", "message": "Password too weak.", "errors": list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        reset_token.delete()

        return Response(
            {"status": "success", "message": "Password has been reset. You can now sign in."},
            status=status.HTTP_200_OK,
        )


def _send_password_reset_email(user, token: str) -> None:
    """Send password reset email. Non-fatal."""
    from django.core.mail import send_mail
    from django.conf import settings
    import logging

    logger = logging.getLogger(__name__)
    try:
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{base_url}/reset-password?token={token}"
        subject = "Reset your password"
        body = (
            f"Hello {user.full_name},\n\n"
            f"We received a request to reset your password. Click the link below:\n\n"
            f"{reset_url}\n\n"
            f"This link expires in 1 hour.\n\n"
            f"If you didn't request this, you can ignore this email.\n\n"
            f"— The Proof Platform Team"
        )
        from_email = getattr(settings, "EMAIL_HOST_USER", "noreply@proofplatform.com")
        send_mail(subject, body, from_email, [user.email], fail_silently=True)
        logger.info("Password reset email sent to %s", user.email)
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", user.email, exc)
