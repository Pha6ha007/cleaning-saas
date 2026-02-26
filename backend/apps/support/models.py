"""
Support Chat Models

Provides AI-powered support chat sessions for product documentation.
Context-aware: supports 'cleaning' and 'maintenance' products.

RBAC:
- owner, manager: full access
- staff: read-only access
- cleaner: no access
"""

from django.db import models
from django.conf import settings
from apps.accounts.models import Company


class SupportChatSession(models.Model):
    """
    AI chat session for product support.

    Each session represents a conversation thread between a user
    and the AI assistant about a specific product context.
    """

    PRODUCT_CLEANING = 'cleaning'
    PRODUCT_MAINTENANCE = 'maintenance'

    PRODUCT_CHOICES = [
        (PRODUCT_CLEANING, 'Cleaning'),
        (PRODUCT_MAINTENANCE, 'Maintenance'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='support_sessions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_sessions'
    )
    product = models.CharField(
        max_length=50,
        choices=PRODUCT_CHOICES,
        default=PRODUCT_CLEANING,
        help_text="Product context for this support session"
    )
    title = models.CharField(
        max_length=200,
        blank=True,
        help_text="Auto-generated from first message"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Support Chat Session'
        verbose_name_plural = 'Support Chat Sessions'

    def __str__(self):
        return f"{self.product} - {self.title[:50] if self.title else 'Untitled'}"


class SupportChatMessage(models.Model):
    """
    Single message within a support chat session.

    Messages alternate between 'user' (customer question) and
    'assistant' (AI response).
    """

    ROLE_USER = 'user'
    ROLE_ASSISTANT = 'assistant'

    ROLE_CHOICES = [
        (ROLE_USER, 'User'),
        (ROLE_ASSISTANT, 'Assistant'),
    ]

    session = models.ForeignKey(
        SupportChatSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='support_messages'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Support Chat Message'
        verbose_name_plural = 'Support Chat Messages'

    def __str__(self):
        preview = self.content[:50]
        return f"{self.role}: {preview}"
