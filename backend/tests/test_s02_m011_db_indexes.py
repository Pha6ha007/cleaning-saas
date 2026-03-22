# backend/tests/test_s02_m011_db_indexes.py
"""
M011/S02: DB Indexes — Verify production indexes exist on maintenance models.

These tests verify that the migration 0012_m011_production_indexes applied correctly.
They use Django's introspection API to check index existence on SQLite test DB.
"""

import pytest
from django.db import connection


def get_table_indexes(table_name: str) -> set[str]:
    """Return set of index names for a given table."""
    with connection.cursor() as cursor:
        introspection = connection.introspection
        indexes = introspection.get_constraints(cursor, table_name)
        return {name for name, info in indexes.items() if info.get("index")}


@pytest.mark.django_db
class TestMaintenanceIndexes:

    def test_asset_company_location_active_index_exists(self):
        indexes = get_table_indexes("apps_maintenance_asset")
        assert "asset_co_loc_active_idx" in indexes, \
            f"Missing asset_co_loc_active_idx. Got: {indexes}"

    def test_asset_company_active_index_exists(self):
        indexes = get_table_indexes("apps_maintenance_asset")
        assert "asset_co_active_idx" in indexes, \
            f"Missing asset_co_active_idx. Got: {indexes}"

    def test_part_company_active_stock_index_exists(self):
        indexes = get_table_indexes("apps_maintenance_part")
        assert "part_co_active_stock_idx" in indexes, \
            f"Missing part_co_active_stock_idx. Got: {indexes}"

    def test_recurring_template_company_active_index_exists(self):
        indexes = get_table_indexes("apps_maintenance_recurringvisittemplate")
        assert "rvt_co_active_start_idx" in indexes, \
            f"Missing rvt_co_active_start_idx. Got: {indexes}"

    def test_visit_part_job_part_index_exists(self):
        indexes = get_table_indexes("apps_maintenance_visitpart")
        assert "visitpart_job_part_idx" in indexes, \
            f"Missing visitpart_job_part_idx. Got: {indexes}"

    def test_service_contract_status_index_exists(self):
        indexes = get_table_indexes("apps_maintenance_servicecontract")
        assert "contract_co_status_end_idx" in indexes, \
            f"Missing contract_co_status_end_idx. Got: {indexes}"
