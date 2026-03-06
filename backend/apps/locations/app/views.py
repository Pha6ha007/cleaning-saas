# backend/apps/locations/app/views.py

from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination

from apps.locations.models import Location
from apps.locations.app.serializers import LocationSerializer


class LocationsPagination(PageNumberPagination):
    """Pagination for locations list endpoint."""
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ManagerLocationsListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/manager/locations/[?page=1&page_size=20]
    POST /api/manager/locations/

    Работает только с локациями компании текущего менеджера.

    Returns paginated response:
    {
        "count": total_count,
        "next": url_or_null,
        "previous": url_or_null,
        "results": [...]
    }
    """

    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LocationsPagination

    def get_queryset(self):
        user = self.request.user
        company = getattr(user, "company", None)

        qs = Location.objects.all()
        if company is not None:
            qs = qs.filter(company=company)

        return qs.order_by("id")

    def perform_create(self, serializer):
        user = self.request.user
        company = getattr(user, "company", None)
        serializer.save(company=company)


class ManagerLocationDetailView(generics.UpdateAPIView):
    """
    PATCH /api/manager/locations/<id>/
    """

    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company = getattr(user, "company", None)

        qs = Location.objects.all()
        if company is not None:
            qs = qs.filter(company=company)

        return qs.order_by("id")
