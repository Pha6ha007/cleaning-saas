"""
Simple analytics endpoint for page view tracking.
No PII is collected — only anonymous session IDs and page paths.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.utils import timezone

from apps.analytics.models import PageView


class PageViewTrackingView(APIView):
    """
    POST /api/analytics/page-view/
    Body: { path, referrer?, timestamp?, session_id }

    Lightweight fire-and-forget tracking.
    Always returns 204 — errors are swallowed to never block the client.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        try:
            path = (request.data.get("path") or "")[:500]
            if not path:
                return Response(status=http_status.HTTP_204_NO_CONTENT)

            PageView.objects.create(
                path=path,
                referrer=(request.data.get("referrer") or "")[:1000],
                session_id=(request.data.get("session_id") or "anonymous")[:64],
                timestamp=request.data.get("timestamp") or timezone.now(),
            )
        except Exception:
            pass  # Analytics should never fail visibly

        return Response(status=http_status.HTTP_204_NO_CONTENT)
