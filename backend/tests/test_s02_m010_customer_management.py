# backend/tests/test_s02_m010_customer_management.py
"""
M010/S02: Customer Portal — Customer Management (Owner) Tests

Covers:
1. CustomerManagementListCreateView (GET + POST)
2. CustomerManagementDetailView (GET + PATCH + DELETE)
3. CustomerResetPasswordView (POST)
"""

import pytest
from datetime import date
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.accounts.models import Company, User
from apps.locations.models import Location


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Mgmt Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


@pytest.fixture
def other_company(db):
    return Company.objects.create(
        name="Other Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix=""):
    u = User(
        company=company,
        role=role,
        email=f"{role}{suffix}@mgmt.local",
        full_name=f"{role.title()} {suffix}",
        is_active=True,
    )
    u.set_password("pass123")
    u.save()
    return u


@pytest.fixture
def owner(company, db):
    return _make_user(company, User.ROLE_OWNER)


@pytest.fixture
def manager(company, db):
    return _make_user(company, User.ROLE_MANAGER)


@pytest.fixture
def staff(company, db):
    return _make_user(company, User.ROLE_STAFF)


@pytest.fixture
def location(company, db):
    return Location.objects.create(
        company=company, name="Mgmt Bldg", address="1 Mgmt St", is_active=True
    )


@pytest.fixture
def customer(company, location, db):
    u = _make_user(company, User.ROLE_CUSTOMER)
    u.customer_locations.add(location)
    return u


def auth_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# CustomerManagementListCreateView — GET
# =============================================================================

@pytest.mark.django_db
class TestCustomerManagementList:
    """GET /api/company/customers/"""

    def test_owner_can_list_customers(self, owner, customer):
        resp = auth_client(owner).get("/api/company/customers/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(c["id"] == customer.id for c in data)

    def test_manager_can_list_customers(self, manager, customer):
        resp = auth_client(manager).get("/api/company/customers/")
        assert resp.status_code == 200

    def test_staff_blocked(self, staff):
        resp = auth_client(staff).get("/api/company/customers/")
        assert resp.status_code == 403

    def test_customer_row_has_required_fields(self, owner, customer):
        resp = auth_client(owner).get("/api/company/customers/")
        assert resp.status_code == 200
        row = resp.json()[0]
        assert "id" in row
        assert "email" in row
        assert "full_name" in row
        assert "locations" in row
        assert "is_active" in row

    def test_only_own_company_customers_returned(self, owner, other_company, db):
        # Customer from another company should not appear
        other_cust = _make_user(other_company, User.ROLE_CUSTOMER, "_other")
        resp = auth_client(owner).get("/api/company/customers/")
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.json()]
        assert other_cust.id not in ids

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/company/customers/")
        assert resp.status_code == 401


# =============================================================================
# CustomerManagementListCreateView — POST
# =============================================================================

@pytest.mark.django_db
class TestCustomerCreate:
    """POST /api/company/customers/"""

    def test_owner_can_create_customer(self, owner, location):
        resp = auth_client(owner).post("/api/company/customers/", {
            "email": "newcust@test.local",
            "full_name": "New Customer",
            "location_ids": [location.id],
        }, format="json")
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newcust@test.local"
        assert "temp_password" in data

    def test_created_customer_has_correct_role(self, owner, location, db):
        auth_client(owner).post("/api/company/customers/", {
            "email": "rolecust@test.local",
            "full_name": "Role Customer",
            "location_ids": [location.id],
        }, format="json")
        user = User.objects.get(email="rolecust@test.local")
        assert user.role == User.ROLE_CUSTOMER
        assert user.company == owner.company

    def test_created_customer_has_must_change_password(self, owner, location, db):
        auth_client(owner).post("/api/company/customers/", {
            "email": "pwdcust@test.local",
            "full_name": "Pwd Customer",
            "location_ids": [location.id],
        }, format="json")
        user = User.objects.get(email="pwdcust@test.local")
        assert user.must_change_password is True

    def test_locations_assigned(self, owner, location, db):
        auth_client(owner).post("/api/company/customers/", {
            "email": "loccust@test.local",
            "full_name": "Loc Customer",
            "location_ids": [location.id],
        }, format="json")
        user = User.objects.get(email="loccust@test.local")
        assert location in user.customer_locations.all()

    def test_duplicate_email_returns_409(self, owner, location, customer):
        resp = auth_client(owner).post("/api/company/customers/", {
            "email": customer.email,
            "full_name": "Dup",
            "location_ids": [location.id],
        }, format="json")
        assert resp.status_code == 409
        assert resp.json()["code"] == "CONFLICT"

    def test_missing_email_returns_400(self, owner, location):
        resp = auth_client(owner).post("/api/company/customers/", {
            "full_name": "No Email",
            "location_ids": [location.id],
        }, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"

    def test_missing_full_name_returns_400(self, owner, location):
        resp = auth_client(owner).post("/api/company/customers/", {
            "email": "nofullname@test.local",
            "location_ids": [location.id],
        }, format="json")
        assert resp.status_code == 400

    def test_staff_cannot_create_customer(self, staff, location):
        resp = auth_client(staff).post("/api/company/customers/", {
            "email": "staffcust@test.local",
            "full_name": "Staff Attempt",
            "location_ids": [location.id],
        }, format="json")
        assert resp.status_code == 403

    def test_foreign_location_id_silently_ignored(self, owner, other_company, db):
        # Location from other company should not be assigned
        other_loc = Location.objects.create(
            company=other_company, name="Other Loc", address="X", is_active=True
        )
        resp = auth_client(owner).post("/api/company/customers/", {
            "email": "foreignloc@test.local",
            "full_name": "Foreign Loc",
            "location_ids": [other_loc.id],
        }, format="json")
        assert resp.status_code == 201
        user = User.objects.get(email="foreignloc@test.local")
        assert other_loc not in user.customer_locations.all()


# =============================================================================
# CustomerManagementDetailView — GET
# =============================================================================

@pytest.mark.django_db
class TestCustomerManagementDetail:
    """GET/PATCH/DELETE /api/company/customers/{id}/"""

    def test_owner_can_get_customer(self, owner, customer):
        resp = auth_client(owner).get(f"/api/company/customers/{customer.id}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == customer.id

    def test_manager_can_get_customer(self, manager, customer):
        resp = auth_client(manager).get(f"/api/company/customers/{customer.id}/")
        assert resp.status_code == 200

    def test_staff_blocked(self, staff, customer):
        resp = auth_client(staff).get(f"/api/company/customers/{customer.id}/")
        assert resp.status_code == 403

    def test_cross_company_customer_not_found(self, owner, other_company, db):
        other_cust = _make_user(other_company, User.ROLE_CUSTOMER, "_x")
        resp = auth_client(owner).get(f"/api/company/customers/{other_cust.id}/")
        assert resp.status_code == 404

    def test_owner_can_patch_customer(self, owner, customer):
        resp = auth_client(owner).patch(f"/api/company/customers/{customer.id}/", {
            "full_name": "Updated Name",
            "phone": "+971500000001",
        }, format="json")
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_patch_updates_locations(self, owner, customer, location, company, db):
        loc2 = Location.objects.create(
            company=company, name="New Loc", address="Y", is_active=True
        )
        resp = auth_client(owner).patch(f"/api/company/customers/{customer.id}/", {
            "location_ids": [loc2.id],
        }, format="json")
        assert resp.status_code == 200
        customer.refresh_from_db()
        loc_ids = list(customer.customer_locations.values_list("id", flat=True))
        assert loc2.id in loc_ids

    def test_patch_can_deactivate_customer(self, owner, customer):
        resp = auth_client(owner).patch(f"/api/company/customers/{customer.id}/", {
            "is_active": False,
        }, format="json")
        assert resp.status_code == 200
        customer.refresh_from_db()
        assert customer.is_active is False

    def test_owner_can_delete_customer(self, owner, company, location, db):
        to_delete = _make_user(company, User.ROLE_CUSTOMER, "_del")
        to_delete.customer_locations.add(location)
        resp = auth_client(owner).delete(f"/api/company/customers/{to_delete.id}/")
        assert resp.status_code == 204
        assert not User.objects.filter(id=to_delete.id).exists()

    def test_staff_cannot_delete_customer(self, staff, customer):
        resp = auth_client(staff).delete(f"/api/company/customers/{customer.id}/")
        assert resp.status_code == 403

    def test_nonexistent_customer_returns_404(self, owner):
        resp = auth_client(owner).get("/api/company/customers/999999/")
        assert resp.status_code == 404


# =============================================================================
# CustomerResetPasswordView
# =============================================================================

@pytest.mark.django_db
class TestCustomerResetPassword:
    """POST /api/company/customers/{id}/reset-password/"""

    def test_owner_can_reset_password(self, owner, customer):
        old_hash = customer.password
        resp = auth_client(owner).post(
            f"/api/company/customers/{customer.id}/reset-password/"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "temp_password" in data
        assert data["email"] == customer.email
        # Password hash should have changed
        customer.refresh_from_db()
        assert customer.password != old_hash

    def test_manager_can_reset_password(self, manager, customer):
        resp = auth_client(manager).post(
            f"/api/company/customers/{customer.id}/reset-password/"
        )
        assert resp.status_code == 200

    def test_must_change_password_set_after_reset(self, owner, customer):
        customer.must_change_password = False
        customer.save()
        auth_client(owner).post(
            f"/api/company/customers/{customer.id}/reset-password/"
        )
        customer.refresh_from_db()
        assert customer.must_change_password is True

    def test_staff_cannot_reset_password(self, staff, customer):
        resp = auth_client(staff).post(
            f"/api/company/customers/{customer.id}/reset-password/"
        )
        assert resp.status_code == 403

    def test_nonexistent_customer_returns_404(self, owner):
        resp = auth_client(owner).post("/api/company/customers/999999/reset-password/")
        assert resp.status_code == 404

    def test_cross_company_customer_not_found(self, owner, other_company, db):
        other_cust = _make_user(other_company, User.ROLE_CUSTOMER, "_x2")
        resp = auth_client(owner).post(
            f"/api/company/customers/{other_cust.id}/reset-password/"
        )
        assert resp.status_code == 404

    def test_unauthenticated_rejected(self, customer):
        resp = APIClient().post(
            f"/api/company/customers/{customer.id}/reset-password/"
        )
        assert resp.status_code == 401
