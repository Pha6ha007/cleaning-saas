"""
Support Chat URL Configuration
"""

from django.urls import path
from .views import (
    SupportSessionListCreateView,
    SupportSessionMessagesView,
    SupportSendMessageView,
)

urlpatterns = [
    # Session management
    path(
        'sessions/',
        SupportSessionListCreateView.as_view(),
        name='support-session-list-create'
    ),
    path(
        'sessions/<int:session_id>/messages/',
        SupportSessionMessagesView.as_view(),
        name='support-session-messages'
    ),
    path(
        'sessions/<int:session_id>/message/',
        SupportSendMessageView.as_view(),
        name='support-send-message'
    ),
]
