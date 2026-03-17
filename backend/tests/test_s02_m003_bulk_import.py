# backend/tests/test_s02_m003_bulk_import.py
"""
M003/S02: Bulk Import (django-import-export) — Contract Tests

Proves:
1. import_export is installed and in INSTALLED_APPS
2. LocationResource imports a valid CSV row
3. ChecklistTemplateResource imports a valid CSV row
4. AssetResource imports a valid CSV row
5. LocationAdmin is an ImportExportModelAdmin subclass
6. ChecklistTemplateAdmin is an ImportExportModelAdmin subclass
7. AssetAdmin is an ImportExportModelAdmin subclass
8. Location import correctly sets company from ForeignKey widget
9. Asset import correctly resolves location by name
10. Duplicate import (skip_unchanged=True) doesn't create duplicate records
"""

import pytest
from tablib import Dataset


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="BulkImport Co", plan="active")


@pytest.fixture
def location(company, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company, name="Import Test Building")


@pytest.fixture
def asset_type(company, db):
    from apps.maintenance.models import AssetType
    return AssetType.objects.create(company=company, name="HVAC")


# =============================================================================
# Setup & Installation
# =============================================================================

class TestImportExportSetup:
    def test_import_export_in_installed_apps(self):
        from django.conf import settings
        assert "import_export" in settings.INSTALLED_APPS

    def test_import_export_importable(self):
        from import_export import resources
        assert resources is not None

    def test_tablib_importable(self):
        from tablib import Dataset
        ds = Dataset(headers=["name", "value"])
        ds.append(["test", "123"])
        assert len(ds) == 1


# =============================================================================
# LocationResource Tests
# =============================================================================

@pytest.mark.django_db
class TestLocationResource:
    def test_location_resource_importable(self):
        from apps.locations.admin import LocationResource
        assert LocationResource is not None

    def test_import_valid_location_row(self, company):
        from apps.locations.admin import LocationResource
        from apps.locations.models import Location

        resource = LocationResource()
        dataset = Dataset(headers=["name", "address", "notes", "latitude", "longitude", "is_active", "company"])
        dataset.append(["Warehouse B", "Jebel Ali", "Loading bay area", "25.01", "55.10", "1", company.name])

        result = resource.import_data(dataset, dry_run=False)
        assert not result.has_errors(), f"Import errors: {result.row_errors()}"
        assert Location.objects.filter(name="Warehouse B", company=company).exists()

    def test_dry_run_does_not_persist(self, company):
        from apps.locations.admin import LocationResource
        from apps.locations.models import Location

        resource = LocationResource()
        dataset = Dataset(headers=["name", "address", "company"])
        dataset.append(["Dry Run Location", "Test St", company.name])

        result = resource.import_data(dataset, dry_run=True)
        assert not result.has_errors()
        assert not Location.objects.filter(name="Dry Run Location").exists()

    def test_skip_unchanged_does_not_duplicate(self, company):
        from apps.locations.admin import LocationResource
        from apps.locations.models import Location

        # Create existing
        loc = Location.objects.create(company=company, name="Existing Location", address="Old St")

        resource = LocationResource()
        dataset = Dataset(headers=["id", "name", "address", "company"])
        dataset.append([loc.id, "Existing Location", "Old St", company.name])

        resource.import_data(dataset, dry_run=False)
        resource.import_data(dataset, dry_run=False)

        assert Location.objects.filter(name="Existing Location").count() == 1


# =============================================================================
# ChecklistTemplateResource Tests
# =============================================================================

@pytest.mark.django_db
class TestChecklistTemplateResource:
    def test_checklist_resource_importable(self):
        from apps.locations.admin import ChecklistTemplateResource
        assert ChecklistTemplateResource is not None

    def test_import_valid_checklist_row(self, company):
        from apps.locations.admin import ChecklistTemplateResource
        from apps.locations.models import ChecklistTemplate

        resource = ChecklistTemplateResource()
        dataset = Dataset(headers=["name", "description", "context", "is_active", "company"])
        dataset.append(["Office Deep Clean", "Full office checklist", "cleaning", "1", company.name])

        result = resource.import_data(dataset, dry_run=False)
        assert not result.has_errors(), f"Import errors: {result.row_errors()}"
        assert ChecklistTemplate.objects.filter(name="Office Deep Clean", company=company).exists()


# =============================================================================
# AssetResource Tests
# =============================================================================

@pytest.mark.django_db
class TestAssetResource:
    def test_asset_resource_importable(self):
        from apps.maintenance.admin import AssetResource
        assert AssetResource is not None

    def test_import_valid_asset_row(self, company, location, asset_type):
        from apps.maintenance.admin import AssetResource
        from apps.maintenance.models import Asset

        resource = AssetResource()
        dataset = Dataset(headers=["name", "serial_number", "description", "is_active", "company", "location", "asset_type"])
        dataset.append(["HVAC Unit 3", "SN-789", "Rooftop unit", "1", company.name, location.name, asset_type.name])

        result = resource.import_data(dataset, dry_run=False)
        assert not result.has_errors(), f"Import errors: {result.row_errors()}"
        assert Asset.objects.filter(name="HVAC Unit 3", company=company).exists()

    def test_asset_dry_run_does_not_persist(self, company, location, asset_type):
        from apps.maintenance.admin import AssetResource
        from apps.maintenance.models import Asset

        resource = AssetResource()
        dataset = Dataset(headers=["name", "serial_number", "company", "location", "asset_type"])
        dataset.append(["Dry Run Asset", "SN-DRY", company.name, location.name, asset_type.name])

        result = resource.import_data(dataset, dry_run=True)
        assert not result.has_errors()
        assert not Asset.objects.filter(name="Dry Run Asset").exists()


# =============================================================================
# Admin Class Tests
# =============================================================================

class TestAdminClassTypes:
    def test_location_admin_is_import_export(self):
        from import_export.admin import ImportExportModelAdmin
        from apps.locations.admin import LocationAdmin
        assert issubclass(LocationAdmin, ImportExportModelAdmin)

    def test_checklist_admin_is_import_export(self):
        from import_export.admin import ImportExportModelAdmin
        from apps.locations.admin import ChecklistTemplateAdmin
        assert issubclass(ChecklistTemplateAdmin, ImportExportModelAdmin)

    def test_asset_admin_is_import_export(self):
        from import_export.admin import ImportExportModelAdmin
        from apps.maintenance.admin import AssetAdmin
        assert issubclass(AssetAdmin, ImportExportModelAdmin)

    def test_location_resource_skip_unchanged_enabled(self):
        from apps.locations.admin import LocationResource
        assert LocationResource._meta.skip_unchanged is True

    def test_asset_resource_skip_unchanged_enabled(self):
        from apps.maintenance.admin import AssetResource
        assert AssetResource._meta.skip_unchanged is True
