"""
Support Chat API Views

Provides REST endpoints for AI-powered support chat.

Endpoints:
- POST /api/support/sessions/              Create new session
- GET /api/support/sessions/               List user's sessions
- GET /api/support/sessions/{id}/messages/ Get session messages
- POST /api/support/sessions/{id}/message/ Send message and get AI response

RBAC:
- owner, manager: full access
- staff: read-only access
- cleaner: no access
"""

import logging
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from .models import SupportChatSession, SupportChatMessage
from .ai_service import get_ai_service

logger = logging.getLogger(__name__)


class SupportPermissionMixin:
    """
    Common permission checks for support endpoints.

    RBAC:
    - owner, manager: full access (read + write)
    - staff: read-only access
    - cleaner: no access
    """

    def _get_company(self, request):
        """Returns (company, error_response). If error_response is not None, return it."""
        user = request.user
        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {"code": "NO_COMPANY", "message": "User has no associated company."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return company, None

    def _check_read_access(self, request):
        """
        Check if user has read access (owner, manager, staff).
        Returns (company, error_response).
        """
        user = request.user
        if user.role not in [User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF]:
            return None, Response(
                {"code": "FORBIDDEN", "message": "Only console users can access this resource."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return self._get_company(request)

    def _check_write_access(self, request):
        """
        Check if user has write access (owner, manager only).
        Returns (company, error_response).
        """
        user = request.user
        if user.role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return None, Response(
                {"code": "FORBIDDEN", "message": "Only owner or manager can modify this resource."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return self._get_company(request)


class SupportSessionListCreateView(SupportPermissionMixin, APIView):
    """
    List and create support chat sessions.

    GET /api/support/sessions/
    POST /api/support/sessions/
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List user's support sessions."""
        company, error = self._check_read_access(request)
        if error:
            return error

        # Get sessions for this company, ordered by most recent
        sessions = SupportChatSession.objects.filter(
            company=company
        ).order_by('-updated_at')[:20]

        data = [
            {
                "id": str(session.id),
                "product": session.product,
                "title": session.title,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat(),
            }
            for session in sessions
        ]

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create new support session."""
        company, error = self._check_write_access(request)
        if error:
            return error

        # Get product from request (default to 'cleaning')
        product = request.data.get('product', 'cleaning')

        if product not in ['cleaning', 'maintenance']:
            return Response(
                {"code": "INVALID_PRODUCT", "message": "Product must be 'cleaning' or 'maintenance'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create new session
        session = SupportChatSession.objects.create(
            company=company,
            user=request.user,
            product=product
        )

        return Response(
            {
                "id": str(session.id),
                "product": session.product,
                "title": session.title,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat(),
            },
            status=status.HTTP_201_CREATED
        )


class SupportSessionMessagesView(SupportPermissionMixin, APIView):
    """
    Get messages for a support session.

    GET /api/support/sessions/{id}/messages/
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        """Get all messages in a session."""
        company, error = self._check_read_access(request)
        if error:
            return error

        # Get session
        session = get_object_or_404(
            SupportChatSession,
            id=session_id,
            company=company
        )

        # Get messages
        messages = session.messages.all()

        data = [
            {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ]

        return Response(data, status=status.HTTP_200_OK)


class SupportSendMessageView(SupportPermissionMixin, APIView):
    """
    Send message and get AI response.

    POST /api/support/sessions/{id}/message/
    Body: {"message": "How do I create a job?"}
    """

    authentication_classes = [JWTAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        """Send message and get AI response."""
        company, error = self._check_write_access(request)
        if error:
            return error

        # Get session
        session = get_object_or_404(
            SupportChatSession,
            id=session_id,
            company=company
        )

        # Get user message
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response(
                {"code": "EMPTY_MESSAGE", "message": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save user message
        user_msg = SupportChatMessage.objects.create(
            session=session,
            company=company,
            role=SupportChatMessage.ROLE_USER,
            content=user_message
        )

        # Get conversation history (last 10 messages before this one)
        previous_messages = session.messages.exclude(
            id=user_msg.id
        ).order_by('-created_at')[:10]

        # Reverse to get chronological order
        previous_messages = list(reversed(previous_messages))

        # Format history for AI
        conversation_history = [
            (msg.role, msg.content)
            for msg in previous_messages
        ]

        # Generate AI response
        ai_service = get_ai_service()
        try:
            ai_response = ai_service.generate_response(
                product=session.product,
                user_message=user_message,
                conversation_history=conversation_history
            )
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            ai_response = (
                "I'm having trouble right now. Please try again in a moment "
                "or contact support directly."
            )

        # Save assistant response
        assistant_msg = SupportChatMessage.objects.create(
            session=session,
            company=company,
            role=SupportChatMessage.ROLE_ASSISTANT,
            content=ai_response
        )

        # Update session title if this is the first message
        if not session.title:
            # Use first 50 chars of user message as title
            session.title = user_message[:50]
            session.save(update_fields=['title'])

        # Return both messages
        return Response(
            {
                "user_message": {
                    "id": str(user_msg.id),
                    "role": user_msg.role,
                    "content": user_msg.content,
                    "created_at": user_msg.created_at.isoformat(),
                },
                "assistant_message": {
                    "id": str(assistant_msg.id),
                    "role": assistant_msg.role,
                    "content": assistant_msg.content,
                    "created_at": assistant_msg.created_at.isoformat(),
                },
            },
            status=status.HTTP_200_OK
        )
