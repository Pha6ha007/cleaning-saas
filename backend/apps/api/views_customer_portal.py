# backend/apps/api/views_customer_portal.py
"""
Customer Portal API Views (Stage 16)

Read-only API endpoints for customers to view their assets, visits, and contracts.
Customers can only see data for locations assigned to them via customer_locations.

RBAC:
- All endpoints require role=customer
- Data scoped to customer_locations only
"""

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.locations.models import Location
from apps.maintenance.models import Asset, ServiceContract
from apps.jobs.models import Job


class CustomerPermissionMixin:
    """
    Mixin that ensures user is a customer and scopes data to their locations.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_customer_location_ids(self, user: User) -> list[int]:
        """Get location IDs this customer can access."""
        if user.role != User.ROLE_CUSTOMER:
            return []
        return user.get_accessible_location_ids()

    def check_customer_access(self, request) -> tuple[bool, Response | None]:
        """
        Check if user is a customer with valid access.
        Returns (is_valid, error_response).
        """
        user = request.user
        if user.role != User.ROLE_CUSTOMER:
            return False, Response(
                {"code": "FORBIDDEN", "message": "Customer access required"},
                status=status.HTTP_403_FORBIDDEN
            )

        location_ids = self.get_customer_location_ids(user)
        if not location_ids:
            return False, Response(
                {"code": "NO_ACCESS", "message": "No locations assigned to this customer"},
                status=status.HTTP_403_FORBIDDEN
            )

        return True, None


# =============================================================================
# Customer Dashboard
# =============================================================================

class CustomerDashboardView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/dashboard/

    Dashboard summary for customer:
    - Total assets
    - Upcoming visits (scheduled)
    - Recent completions
    - Active contracts
    """

    def get(self, request):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)

        # Count assets
        total_assets = Asset.objects.filter(
            location_id__in=location_ids,
            is_active=True
        ).count()

        # Count upcoming visits (scheduled)
        upcoming_visits = Job.objects.filter(
            location_id__in=location_ids,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_SCHEDULED
        ).count()

        # Count recent completions (last 30 days)
        from django.utils import timezone
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_completions = Job.objects.filter(
            location_id__in=location_ids,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_COMPLETED,
            actual_end_time__gte=thirty_days_ago
        ).count()

        # Count active contracts
        active_contracts = ServiceContract.objects.filter(
            location_id__in=location_ids,
            status="active"
        ).count()

        return Response({
            "total_assets": total_assets,
            "upcoming_visits": upcoming_visits,
            "recent_completions": recent_completions,
            "active_contracts": active_contracts,
            "locations_count": len(location_ids),
        })


# =============================================================================
# Customer Locations
# =============================================================================

class CustomerLocationsView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/locations/

    List locations assigned to this customer.
    """

    def get(self, request):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)
        locations = Location.objects.filter(
            id__in=location_ids,
            is_active=True
        ).order_by("name")

        data = [
            {
                "id": loc.id,
                "name": loc.name,
                "address": loc.address or "",
                "latitude": loc.latitude,
                "longitude": loc.longitude,
            }
            for loc in locations
        ]

        return Response(data)


# =============================================================================
# Customer Assets
# =============================================================================

class CustomerAssetsView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/assets/

    List assets at customer's locations.
    Optional filter: ?location_id=N
    """

    def get(self, request):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)

        # Filter by specific location if provided
        filter_location = request.query_params.get("location_id")
        if filter_location:
            try:
                filter_location = int(filter_location)
                if filter_location not in location_ids:
                    return Response(
                        {"code": "FORBIDDEN", "message": "Access denied to this location"},
                        status=status.HTTP_403_FORBIDDEN
                    )
                location_ids = [filter_location]
            except ValueError:
                pass

        assets = Asset.objects.filter(
            location_id__in=location_ids,
            is_active=True
        ).select_related("location", "asset_type").order_by("name")

        data = [
            {
                "id": asset.id,
                "name": asset.name,
                "serial_number": asset.serial_number or "",
                "description": asset.description or "",
                "location": {
                    "id": asset.location.id,
                    "name": asset.location.name,
                },
                "asset_type": {
                    "id": asset.asset_type.id,
                    "name": asset.asset_type.name,
                } if asset.asset_type else None,
                "warranty_status": asset.warranty_status,
                "warranty_end_date": asset.warranty_end_date.isoformat() if asset.warranty_end_date else None,
            }
            for asset in assets
        ]

        return Response(data)


class CustomerAssetDetailView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/assets/{id}/

    Get single asset details (if in customer's locations).
    """

    def get(self, request, pk):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)

        try:
            asset = Asset.objects.select_related("location", "asset_type").get(
                pk=pk,
                location_id__in=location_ids,
                is_active=True
            )
        except Asset.DoesNotExist:
            return Response(
                {"code": "NOT_FOUND", "message": "Asset not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = {
            "id": asset.id,
            "name": asset.name,
            "serial_number": asset.serial_number or "",
            "description": asset.description or "",
            "location": {
                "id": asset.location.id,
                "name": asset.location.name,
                "address": asset.location.address or "",
            },
            "asset_type": {
                "id": asset.asset_type.id,
                "name": asset.asset_type.name,
            } if asset.asset_type else None,
            "warranty_status": asset.warranty_status,
            "warranty_start_date": asset.warranty_start_date.isoformat() if asset.warranty_start_date else None,
            "warranty_end_date": asset.warranty_end_date.isoformat() if asset.warranty_end_date else None,
            "warranty_provider": asset.warranty_provider or "",
            "warranty_notes": asset.warranty_notes or "",
            "created_at": asset.created_at.isoformat(),
        }

        return Response(data)


# =============================================================================
# Customer Visits
# =============================================================================

class CustomerVisitsView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/visits/

    List service visits for customer's assets.
    Optional filters: ?status=scheduled&asset_id=N&location_id=N
    """

    def get(self, request):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)

        visits = Job.objects.filter(
            location_id__in=location_ids,
            context=Job.CONTEXT_MAINTENANCE
        ).select_related("location", "asset", "cleaner").order_by("-scheduled_date", "-id")

        # Apply filters
        status_filter = request.query_params.get("status")
        if status_filter:
            visits = visits.filter(status=status_filter)

        asset_filter = request.query_params.get("asset_id")
        if asset_filter:
            visits = visits.filter(asset_id=asset_filter)

        location_filter = request.query_params.get("location_id")
        if location_filter:
            try:
                loc_id = int(location_filter)
                if loc_id in location_ids:
                    visits = visits.filter(location_id=loc_id)
            except ValueError:
                pass

        # Limit to last 100 visits
        visits = visits[:100]

        data = [
            {
                "id": visit.id,
                "scheduled_date": visit.scheduled_date.isoformat() if visit.scheduled_date else None,
                "status": visit.status,
                "status_display": visit.get_status_display(),
                "location": {
                    "id": visit.location.id,
                    "name": visit.location.name,
                },
                "asset": {
                    "id": visit.asset.id,
                    "name": visit.asset.name,
                } if visit.asset else None,
                "technician": {
                    "id": visit.cleaner.id,
                    "name": visit.cleaner.full_name,
                } if visit.cleaner else None,
                "completed_at": visit.actual_end_time.isoformat() if visit.actual_end_time else None,
                "has_photos": visit.photos.exists(),
            }
            for visit in visits
        ]

        return Response(data)


class CustomerVisitDetailView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/visits/{id}/

    Get single visit details with proof photos (if in customer's locations).
    """

    def get(self, request, pk):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)

        try:
            visit = Job.objects.select_related(
                "location", "asset", "cleaner", "maintenance_category"
            ).prefetch_related("checklist_items").get(
                pk=pk,
                location_id__in=location_ids,
                context=Job.CONTEXT_MAINTENANCE
            )
        except Job.DoesNotExist:
            return Response(
                {"code": "NOT_FOUND", "message": "Visit not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Build checklist items (read-only)
        checklist = [
            {
                "id": item.id,
                "text": item.text,
                "is_required": item.is_required,
                "is_completed": item.is_completed,
            }
            for item in visit.checklist_items.order_by("order", "id")
        ]

        data = {
            "id": visit.id,
            "scheduled_date": visit.scheduled_date.isoformat() if visit.scheduled_date else None,
            "status": visit.status,
            "status_display": visit.get_status_display(),
            "location": {
                "id": visit.location.id,
                "name": visit.location.name,
                "address": visit.location.address or "",
            },
            "asset": {
                "id": visit.asset.id,
                "name": visit.asset.name,
                "serial_number": visit.asset.serial_number or "",
            } if visit.asset else None,
            "category": {
                "id": visit.maintenance_category.id,
                "name": visit.maintenance_category.name,
            } if visit.maintenance_category else None,
            "technician": {
                "id": visit.cleaner.id,
                "name": visit.cleaner.full_name,
            } if visit.cleaner else None,
            "scheduled_start_time": visit.scheduled_start_time.isoformat() if visit.scheduled_start_time else None,
            "scheduled_end_time": visit.scheduled_end_time.isoformat() if visit.scheduled_end_time else None,
            "check_in_time": visit.actual_start_time.isoformat() if visit.actual_start_time else None,
            "check_out_time": visit.actual_end_time.isoformat() if visit.actual_end_time else None,
            "completed_at": visit.actual_end_time.isoformat() if visit.actual_end_time else None,
            "photo_before": None,  # Use /visits/{id}/photos/ endpoint for photos
            "photo_after": None,
            "manager_notes": "",  # Hide internal notes from customers
            "checklist": checklist,
            "checklist_progress": {
                "total": len(checklist),
                "completed": sum(1 for item in checklist if item["is_completed"]),
            },
        }

        return Response(data)


# =============================================================================
# Customer Contracts
# =============================================================================

class CustomerContractsView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/contracts/

    List service contracts for customer's locations.
    """

    def get(self, request):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)

        contracts = ServiceContract.objects.filter(
            location_id__in=location_ids
        ).select_related("location").order_by("-start_date")

        data = [
            {
                "id": contract.id,
                "name": contract.name,
                "contract_type": contract.contract_type,
                "contract_type_display": contract.get_contract_type_display(),
                "status": contract.status,
                "status_display": contract.get_status_display(),
                "location": {
                    "id": contract.location.id,
                    "name": contract.location.name,
                },
                "start_date": contract.start_date.isoformat() if contract.start_date else None,
                "end_date": contract.end_date.isoformat() if contract.end_date else None,
                "is_active": contract.status == "active",
            }
            for contract in contracts
        ]

        return Response(data)


class CustomerContractDetailView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/contracts/{id}/

    Get single contract details (if in customer's locations).
    """

    def get(self, request, pk):
        is_valid, error = self.check_customer_access(request)
        if not is_valid:
            return error

        location_ids = self.get_customer_location_ids(request.user)

        try:
            contract = ServiceContract.objects.select_related("location").get(
                pk=pk,
                location_id__in=location_ids
            )
        except ServiceContract.DoesNotExist:
            return Response(
                {"code": "NOT_FOUND", "message": "Contract not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = {
            "id": contract.id,
            "name": contract.name,
            "description": contract.description or "",
            "contract_type": contract.contract_type,
            "contract_type_display": contract.get_contract_type_display(),
            "status": contract.status,
            "status_display": contract.get_status_display(),
            "location": {
                "id": contract.location.id,
                "name": contract.location.name,
                "address": contract.location.address or "",
            },
            "start_date": contract.start_date.isoformat() if contract.start_date else None,
            "end_date": contract.end_date.isoformat() if contract.end_date else None,
            "terms": contract.service_terms or "",
            "created_at": contract.created_at.isoformat(),
        }

        return Response(data)


# =============================================================================
# Customer Profile
# =============================================================================

class CustomerProfileView(CustomerPermissionMixin, APIView):
    """
    GET /api/customer/profile/

    Get customer's own profile info.
    """

    def get(self, request):
        user = request.user
        if user.role != User.ROLE_CUSTOMER:
            return Response(
                {"code": "FORBIDDEN", "message": "Customer access required"},
                status=status.HTTP_403_FORBIDDEN
            )

        location_ids = self.get_customer_location_ids(user)
        locations = Location.objects.filter(id__in=location_ids).values("id", "name")

        return Response({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone or "",
            "company": {
                "id": user.company.id,
                "name": user.company.name,
            },
            "locations": list(locations),
            "locations_count": len(location_ids),
        })


# =============================================================================
# Customer Management (for Owners)
# =============================================================================

class OwnerPermissionMixin:
    """
    Mixin that ensures user is owner/manager for customer management.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def check_owner_access(self, request) -> tuple[bool, Response | None]:
        """
        Check if user is owner or manager.
        Returns (is_valid, error_response).
        """
        user = request.user
        if user.role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return False, Response(
                {"code": "FORBIDDEN", "message": "Owner or Manager access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        return True, None


class CustomerManagementListCreateView(OwnerPermissionMixin, APIView):
    """
    GET /api/company/customers/
    List all customers for this company.

    POST /api/company/customers/
    Create a new customer user.
    """

    def get(self, request):
        is_valid, error = self.check_owner_access(request)
        if not is_valid:
            return error

        customers = User.objects.filter(
            company=request.user.company,
            role=User.ROLE_CUSTOMER
        ).prefetch_related("customer_locations").order_by("full_name")

        data = [
            {
                "id": c.id,
                "email": c.email,
                "full_name": c.full_name,
                "phone": c.phone or "",
                "is_active": c.is_active,
                "locations": [
                    {"id": loc.id, "name": loc.name}
                    for loc in c.customer_locations.all()
                ],
                "locations_count": c.customer_locations.count(),
                "created_at": c.created_at.isoformat(),
            }
            for c in customers
        ]

        return Response(data)

    def post(self, request):
        is_valid, error = self.check_owner_access(request)
        if not is_valid:
            return error

        data = request.data
        email = data.get("email", "").strip().lower()
        full_name = data.get("full_name", "").strip()
        phone = data.get("phone", "").strip() or None
        location_ids = data.get("location_ids", [])

        # Validation
        if not email:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not full_name:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Full name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check email uniqueness
        if User.objects.filter(email=email).exists():
            return Response(
                {"code": "CONFLICT", "message": "Email already in use"},
                status=status.HTTP_409_CONFLICT
            )

        # Validate location IDs belong to this company
        valid_locations = Location.objects.filter(
            id__in=location_ids,
            company=request.user.company,
            is_active=True
        )

        # Generate temporary password
        import secrets
        temp_password = secrets.token_urlsafe(12)

        # Create customer
        customer = User.objects.create(
            company=request.user.company,
            role=User.ROLE_CUSTOMER,
            email=email,
            full_name=full_name,
            phone=phone,
            is_active=True,
            must_change_password=True,
        )
        customer.set_password(temp_password)
        customer.save()

        # Assign locations
        customer.customer_locations.set(valid_locations)

        return Response({
            "id": customer.id,
            "email": customer.email,
            "full_name": customer.full_name,
            "phone": customer.phone or "",
            "temp_password": temp_password,  # Return so owner can share with customer
            "locations": [
                {"id": loc.id, "name": loc.name}
                for loc in valid_locations
            ],
            "message": "Customer created successfully. Share the temporary password with the customer.",
        }, status=status.HTTP_201_CREATED)


class CustomerManagementDetailView(OwnerPermissionMixin, APIView):
    """
    GET /api/company/customers/{id}/
    Get single customer details.

    PATCH /api/company/customers/{id}/
    Update customer (name, phone, is_active, locations).

    DELETE /api/company/customers/{id}/
    Delete customer.
    """

    def get_customer(self, request, pk):
        """Get customer or return error response."""
        try:
            return User.objects.prefetch_related("customer_locations").get(
                pk=pk,
                company=request.user.company,
                role=User.ROLE_CUSTOMER
            ), None
        except User.DoesNotExist:
            return None, Response(
                {"code": "NOT_FOUND", "message": "Customer not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    def get(self, request, pk):
        is_valid, error = self.check_owner_access(request)
        if not is_valid:
            return error

        customer, error = self.get_customer(request, pk)
        if error:
            return error

        return Response({
            "id": customer.id,
            "email": customer.email,
            "full_name": customer.full_name,
            "phone": customer.phone or "",
            "is_active": customer.is_active,
            "locations": [
                {"id": loc.id, "name": loc.name}
                for loc in customer.customer_locations.all()
            ],
            "created_at": customer.created_at.isoformat(),
        })

    def patch(self, request, pk):
        is_valid, error = self.check_owner_access(request)
        if not is_valid:
            return error

        customer, error = self.get_customer(request, pk)
        if error:
            return error

        data = request.data

        # Update basic fields
        if "full_name" in data:
            customer.full_name = data["full_name"].strip()
        if "phone" in data:
            customer.phone = data["phone"].strip() or None
        if "is_active" in data:
            customer.is_active = bool(data["is_active"])

        customer.save()

        # Update locations if provided
        if "location_ids" in data:
            location_ids = data["location_ids"]
            valid_locations = Location.objects.filter(
                id__in=location_ids,
                company=request.user.company,
                is_active=True
            )
            customer.customer_locations.set(valid_locations)

        return Response({
            "id": customer.id,
            "email": customer.email,
            "full_name": customer.full_name,
            "phone": customer.phone or "",
            "is_active": customer.is_active,
            "locations": [
                {"id": loc.id, "name": loc.name}
                for loc in customer.customer_locations.all()
            ],
        })

    def delete(self, request, pk):
        is_valid, error = self.check_owner_access(request)
        if not is_valid:
            return error

        customer, error = self.get_customer(request, pk)
        if error:
            return error

        customer.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerResetPasswordView(OwnerPermissionMixin, APIView):
    """
    POST /api/company/customers/{id}/reset-password/

    Generate new temporary password for customer.
    """

    def post(self, request, pk):
        is_valid, error = self.check_owner_access(request)
        if not is_valid:
            return error

        try:
            customer = User.objects.get(
                pk=pk,
                company=request.user.company,
                role=User.ROLE_CUSTOMER
            )
        except User.DoesNotExist:
            return Response(
                {"code": "NOT_FOUND", "message": "Customer not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate new temporary password
        import secrets
        temp_password = secrets.token_urlsafe(12)

        customer.set_password(temp_password)
        customer.must_change_password = True
        customer.save()

        return Response({
            "id": customer.id,
            "email": customer.email,
            "temp_password": temp_password,
            "message": "Password reset successfully. Share the new password with the customer.",
        })
