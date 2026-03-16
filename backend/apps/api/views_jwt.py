# backend/apps/api/views_jwt.py
"""
JWT authentication views for Proof Platform.

Provides:
- JWTManagerLoginView: Login for manager portal (owner/manager/staff)
- JWTRefreshView: Token refresh with rotation
- JWTLogoutView: Blacklist refresh token on logout

These endpoints coexist alongside Token auth endpoints.
Mobile app continues using Token auth; manager portal uses JWT.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.models import User
from apps.api.serializers_jwt import ProofTokenObtainPairSerializer


class JWTManagerLoginView(APIView):
    """
    JWT Login for manager portal.

    Validates manager credentials (owner/manager/staff roles only),
    returns access + refresh tokens with custom claims, plus user profile data.

    POST /api/manager/auth/jwt/login/
    Body: {"email": "...", "password": "..."}
    Returns: {
        "access": "...",
        "refresh": "...",
        "user_id": 1,
        "email": "...",
        "full_name": "...",
        "role": "owner"
    }
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    ALLOWED_ROLES = {User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF}

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Look up manager user
        try:
            user = User.objects.get(
                email__iexact=email,
                role__in=list(self.ALLOWED_ROLES),
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Invalid credentials."},
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

        # Generate JWT token pair with custom claims
        token = ProofTokenObtainPairSerializer.get_token(user)

        return Response(
            {
                "access": str(token.access_token),
                "refresh": str(token),
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )


class JWTRefreshView(TokenRefreshView):
    """
    JWT Token Refresh.

    Accepts a refresh token, returns a new access + refresh pair.
    Old refresh token is automatically blacklisted (ROTATE_REFRESH_TOKENS=True).

    POST /api/manager/auth/jwt/refresh/
    Body: {"refresh": "..."}
    Returns: {"access": "...", "refresh": "..."}
    """

    authentication_classes = []
    permission_classes = [AllowAny]


class JWTLogoutView(APIView):
    """
    JWT Logout — blacklist the refresh token.

    Clients send their refresh token on logout so it can't be reused.

    POST /api/manager/auth/jwt/logout/
    Body: {"refresh": "..."}
    Returns: 200 on success
    """

    # Allow both JWT and Token auth to call logout
    # (useful during migration period)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Token is invalid or already blacklisted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )
