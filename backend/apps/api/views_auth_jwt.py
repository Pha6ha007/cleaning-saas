"""
JWT Authentication Views (PR4: Token Security)

These views replace legacy Token authentication with JWT tokens that expire.

Migration strategy:
- New endpoints at /api/auth/jwt/* for JWT authentication
- Old endpoints at /api/auth/* remain for backwards compatibility
- Both authentication methods supported during transition period

Security improvements:
- Access tokens expire after 30 days
- Refresh tokens expire after 90 days
- Token rotation on refresh (old tokens blacklisted)
- Logout invalidates refresh token via blacklist
"""

from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from apps.accounts.models import User


def get_tokens_for_user(user):
    """
    Generate access and refresh tokens for a user.

    Returns:
        dict: {
            'access': str,  # JWT access token
            'refresh': str,  # JWT refresh token
        }
    """
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def get_user_data(user):
    """
    Standard user data response for all login endpoints.
    """
    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    }


class JWTLoginView(APIView):
    """
    JWT login with email + password.

    POST /api/auth/jwt/login/
    {
        "email": "user@example.com",
        "password": "password123"
    }

    Response:
    {
        "access": "eyJ0...",  # Access token (30 days)
        "refresh": "eyJ0...", # Refresh token (90 days)
        "user_id": 1,
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "owner"
    }

    Security: PR4 - Tokens expire, can be refreshed or blacklisted
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        password = (request.data.get("password") or "")

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        # Generate JWT tokens
        tokens = get_tokens_for_user(user)

        return Response(
            {
                **tokens,  # access, refresh
                **get_user_data(user),  # user_id, email, full_name, role
            },
            status=status.HTTP_200_OK,
        )


class JWTCleanerPinLoginView(APIView):
    """
    JWT login for cleaners with phone + PIN.

    POST /api/auth/jwt/cleaner-login/
    {
        "phone": "+971501234567",
        "pin": "1234"
    }

    Response: Same as JWTLoginView

    Security: PR4 - PIN-based mobile auth with expiring tokens
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
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

        # Generate JWT tokens
        tokens = get_tokens_for_user(user)

        return Response(
            {
                **tokens,
                **get_user_data(user),
            },
            status=status.HTTP_200_OK,
        )


class JWTManagerLoginView(APIView):
    """
    JWT login for managers/owners (web dashboard).

    POST /api/auth/jwt/manager-login/
    {
        "email": "manager@company.com",
        "password": "password123"
    }

    Response: Same as JWTLoginView

    Difference from JWTLoginView:
    - Only allows owner/manager/staff roles
    - Returns 401 instead of 400 for consistency with existing behavior

    Security: PR4 - Manager auth with expiring tokens
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

        # Generate JWT tokens
        tokens = get_tokens_for_user(user)

        return Response(
            {
                **tokens,
                **get_user_data(user),
            },
            status=status.HTTP_200_OK,
        )


class JWTLogoutView(APIView):
    """
    JWT logout - blacklists refresh token.

    POST /api/auth/jwt/logout/
    {
        "refresh": "eyJ0..."  # The refresh token to blacklist
    }

    Response:
    {
        "detail": "Logout successful"
    }

    Security: PR4 - Blacklists refresh token so it cannot be used again.
    Access token remains valid until expiration (cannot be blacklisted in stateless JWT).

    Note: Client should delete both access and refresh tokens from storage.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {"detail": "Logout successful"},
                status=status.HTTP_200_OK,
            )
        except TokenError as e:
            return Response(
                {"detail": f"Invalid token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class JWTRefreshView(BaseTokenRefreshView):
    """
    JWT token refresh - get new access token using refresh token.

    POST /api/auth/jwt/refresh/
    {
        "refresh": "eyJ0..."  # The refresh token
    }

    Response:
    {
        "access": "eyJ0...",  # New access token
        "refresh": "eyJ0..."  # New refresh token (due to ROTATE_REFRESH_TOKENS=True)
    }

    Security: PR4 - Rotation enabled, old refresh token blacklisted automatically.

    Note: This extends simplejwt's TokenRefreshView with rotation support.
    """
    pass  # Uses default implementation with our SIMPLE_JWT settings
