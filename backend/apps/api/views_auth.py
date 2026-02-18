# backend/apps/api/views_auth.py

from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

# PR4: JWT imports
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

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
        owner.set_password(password)
        owner.save(update_fields=["password"])

        data = {
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
