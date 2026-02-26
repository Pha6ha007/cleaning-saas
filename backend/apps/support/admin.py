from django.contrib import admin
from .models import SupportChatSession, SupportChatMessage


@admin.register(SupportChatSession)
class SupportChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'user', 'product', 'title', 'created_at', 'updated_at')
    list_filter = ('product', 'created_at')
    search_fields = ('title', 'user__email', 'company__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SupportChatMessage)
class SupportChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'role', 'content_preview', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('content',)
    readonly_fields = ('created_at',)

    def content_preview(self, obj):
        return obj.content[:100]
    content_preview.short_description = 'Content Preview'
