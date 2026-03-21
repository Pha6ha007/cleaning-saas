"""
Backend endpoint for demo login.
Creates a temporary token for the shared demo account.
Demo account is identified by email: demo@proofplatform.com
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model

User = get_user_model()

DEMO_EMAIL_CLEANING = "demo-cleaning@proofplatform.com"
DEMO_EMAIL_MAINTENANCE = "demo-maintenance@proofplatform.com"


class DemoLoginView(APIView):
    """
    POST /api/auth/demo-login/
    Body: { "context": "cleaning" | "maintenance" }

    Returns a token for the demo account.
    Demo accounts are read-only (enforced by is_demo flag).
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        context = request.data.get("context", "cleaning")

        demo_email = (
            DEMO_EMAIL_MAINTENANCE
            if context == "maintenance"
            else DEMO_EMAIL_CLEANING
        )

        try:
            demo_user = User.objects.get(email=demo_email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "Demo account is not available. Please sign up for a free trial."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        token, _ = Token.objects.get_or_create(user=demo_user)

        return Response({
            "token": token.key,
            "user": {
                "email": demo_user.email,
                "name": demo_user.get_full_name() or "Demo User",
                "role": getattr(demo_user, "role", "manager"),
                "is_demo": True,
            },
        })
