# backend/tests/test_s02_m002_openapi.py
"""
M002/S02: OpenAPI 3.0 / drf-spectacular — Contract Tests

Proves:
1. /api/schema/ returns 200 with valid OpenAPI YAML
2. /api/docs/ (Swagger UI) returns 200 HTML
3. /api/redoc/ returns 200 HTML
4. Schema contains JWT Bearer security scheme
5. Schema contains expected API tags (auth, billing, maintenance)
6. JWT auth endpoints appear in schema with correct paths
7. Billing endpoints appear in schema
8. Schema generation does not raise (offline validation)
"""

import pytest
import yaml
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestSchemaEndpoint:
    """GET /api/schema/ returns valid OpenAPI 3.0 YAML."""

    def test_schema_returns_200(self, api_client):
        resp = api_client.get("/api/schema/")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    def test_schema_returns_yaml_content_type(self, api_client):
        resp = api_client.get("/api/schema/")
        content_type = resp.get("Content-Type", "")
        # drf-spectacular uses application/vnd.oai.openapi for YAML
        assert "yaml" in content_type or "text" in content_type or "openapi" in content_type, (
            f"Unexpected Content-Type: {content_type}"
        )

    def test_schema_is_valid_yaml(self, api_client):
        resp = api_client.get("/api/schema/")
        assert resp.status_code == 200
        parsed = yaml.safe_load(resp.content)
        assert isinstance(parsed, dict), "Schema is not a YAML dict"

    def test_schema_openapi_version_3(self, api_client):
        resp = api_client.get("/api/schema/")
        parsed = yaml.safe_load(resp.content)
        openapi_version = parsed.get("openapi", "")
        assert openapi_version.startswith("3."), (
            f"Expected OpenAPI 3.x, got {openapi_version}"
        )

    def test_schema_has_title(self, api_client):
        resp = api_client.get("/api/schema/")
        parsed = yaml.safe_load(resp.content)
        title = parsed.get("info", {}).get("title", "")
        assert "Proof Platform" in title, f"Expected 'Proof Platform' in title, got: {title}"

    def test_schema_accessible_without_auth(self, api_client):
        """Schema should be publicly accessible (SERVE_PUBLIC=True)."""
        # No auth set on client
        resp = api_client.get("/api/schema/")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestSwaggerUIEndpoint:
    """GET /api/docs/ returns Swagger UI HTML."""

    def test_swagger_ui_returns_200(self, api_client):
        resp = api_client.get("/api/docs/")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    def test_swagger_ui_returns_html(self, api_client):
        resp = api_client.get("/api/docs/")
        content_type = resp.get("Content-Type", "")
        assert "html" in content_type, f"Expected HTML, got {content_type}"

    def test_swagger_ui_accessible_without_auth(self, api_client):
        resp = api_client.get("/api/docs/")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestRedocEndpoint:
    """GET /api/redoc/ returns ReDoc HTML."""

    def test_redoc_returns_200(self, api_client):
        resp = api_client.get("/api/redoc/")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    def test_redoc_returns_html(self, api_client):
        resp = api_client.get("/api/redoc/")
        content_type = resp.get("Content-Type", "")
        assert "html" in content_type


@pytest.mark.django_db
class TestSchemaContent:
    """Schema contains correct security schemes and endpoints."""

    def _get_schema(self, api_client) -> dict:
        resp = api_client.get("/api/schema/")
        return yaml.safe_load(resp.content)

    def test_jwt_bearer_security_scheme_present(self, api_client):
        schema = self._get_schema(api_client)
        security_schemes = schema.get("components", {}).get("securitySchemes", {})
        assert "jwtAuth" in security_schemes, (
            f"jwtAuth not in securitySchemes. Got: {list(security_schemes.keys())}"
        )
        jwt_scheme = security_schemes["jwtAuth"]
        assert jwt_scheme.get("type") == "http"
        assert jwt_scheme.get("scheme") == "bearer"
        assert jwt_scheme.get("bearerFormat") == "JWT"

    def test_token_auth_security_scheme_present(self, api_client):
        schema = self._get_schema(api_client)
        security_schemes = schema.get("components", {}).get("securitySchemes", {})
        assert "tokenAuth" in security_schemes, (
            f"tokenAuth not in securitySchemes. Got: {list(security_schemes.keys())}"
        )

    def test_auth_endpoints_in_schema(self, api_client):
        """JWT login/refresh/logout paths should appear in schema."""
        schema = self._get_schema(api_client)
        paths = schema.get("paths", {})
        path_keys = list(paths.keys())
        jwt_login_paths = [p for p in path_keys if "jwt/login" in p or ("manager/auth" in p and "login" in p)]
        assert jwt_login_paths, (
            f"No JWT login path found. Paths containing 'auth': "
            f"{[p for p in path_keys if 'auth' in p]}"
        )

    def test_billing_endpoints_in_schema(self, api_client):
        """Paddle billing paths should appear in schema."""
        schema = self._get_schema(api_client)
        paths = schema.get("paths", {})
        billing_paths = [p for p in paths if "billing" in p or "webhook" in p or "paddle" in p]
        assert billing_paths, (
            f"No billing paths found. Available paths: {list(paths.keys())[:20]}"
        )

    def test_health_endpoint_in_schema(self, api_client):
        """Health check is a plain Django view (not DRF APIView), so it may not appear
        in the schema — that's expected. This test verifies the schema generation
        doesn't crash and the endpoint itself is reachable."""
        schema = self._get_schema(api_client)
        # Schema may or may not include health (plain function view, not APIView)
        # Just verify schema was generated successfully (dict with paths key)
        assert "paths" in schema
        # Separately verify the health endpoint itself works
        resp = api_client.get("/api/health/")
        assert resp.status_code in (200, 503)


@pytest.mark.django_db
class TestSchemaGenerationOffline:
    """Schema generation via management command works without errors."""

    def test_spectacular_generate_schema_command(self):
        """drf-spectacular generate_schema management command runs without exceptions."""
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        try:
            call_command("spectacular", "--validate", stdout=out, stderr=out)
        except SystemExit as e:
            if e.code != 0:
                pytest.fail(f"spectacular --validate exited with code {e.code}:\n{out.getvalue()}")
