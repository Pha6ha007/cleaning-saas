# backend/apps/api/serializers_jwt.py
"""
Custom JWT serializers for Proof Platform.

Adds role and company_id claims to the JWT access token.
Used by JWTManagerLoginView for manager portal authentication.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class ProofTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom serializer that adds platform-specific claims to JWT tokens.

    Custom claims in access token:
    - email: user's email
    - role: user role (owner, manager, staff, cleaner)
    - company_id: ID of the user's company
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token["email"] = user.email
        token["role"] = user.role
        token["company_id"] = user.company_id

        return token
