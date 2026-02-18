"""
JWT Authentication Tests for PR4: Token Security

Tests:
- JWT token generation on login
- Token expiration behavior
- Token refresh with rotation
- Logout blacklisting
- Access/refresh token validation
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.accounts.models import User


@pytest.mark.django_db
class TestJWTLogin:
    """Test JWT login endpoints"""

    def test_jwt_login_success(self, api_client, owner_user):
        """JWT login should return access and refresh tokens"""
        response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'  # Default password from conftest
        })

        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user_id'] == owner_user.id
        assert response.data['role'] == owner_user.role

    def test_jwt_cleaner_pin_login_success(self, api_client, staff_user):
        """JWT cleaner PIN login should work"""
        # Assuming staff_user has PIN set
        from django.contrib.auth.hashers import make_password
        staff_user.pin_hash = make_password('1234')
        staff_user.save()

        response = api_client.post('/api/auth/jwt/cleaner-login/', {
            'phone': staff_user.phone,
            'pin': '1234'
        })

        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_jwt_manager_login_success(self, api_client, manager_user):
        """JWT manager login should work"""
        response = api_client.post('/api/manager/auth/jwt/login/', {
            'email': manager_user.email,
            'password': 'testpass123!'
        })

        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_jwt_login_invalid_credentials(self, api_client, owner_user):
        """JWT login should fail with invalid password"""
        response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'wrongpassword'
        })

        assert response.status_code == 400
        assert 'Invalid credentials' in str(response.data)

    def test_jwt_login_inactive_user(self, api_client, owner_user):
        """JWT login should fail for inactive users"""
        owner_user.is_active = False
        owner_user.save()

        response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })

        assert response.status_code == 400
        assert 'User not found' in str(response.data)


@pytest.mark.django_db
class TestJWTTokenValidation:
    """Test JWT token authentication"""

    def test_access_token_authenticates_requests(self, api_client, owner_user):
        """Access token should authenticate API requests"""
        # Login to get tokens
        response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        access_token = response.data['access']

        # Use access token to access protected endpoint
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = api_client.get('/api/company/')

        # Should succeed (not 401)
        assert response.status_code != 401

    def test_invalid_access_token_rejected(self, api_client):
        """Invalid access token should be rejected"""
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.here')
        response = api_client.get('/api/company/')

        assert response.status_code == 401


@pytest.mark.django_db
class TestJWTTokenRefresh:
    """Test JWT token refresh functionality"""

    def test_refresh_token_generates_new_access_token(self, api_client, owner_user):
        """Refresh token should generate new access token"""
        # Login
        login_response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        old_refresh_token = login_response.data['refresh']
        old_access_token = login_response.data['access']

        # Refresh
        refresh_response = api_client.post('/api/auth/jwt/refresh/', {
            'refresh': old_refresh_token
        })

        assert refresh_response.status_code == 200
        assert 'access' in refresh_response.data
        new_access_token = refresh_response.data['access']

        # New access token should be different
        assert new_access_token != old_access_token

    def test_refresh_token_rotation(self, api_client, owner_user):
        """Refresh should return new refresh token (rotation enabled)"""
        # Login
        login_response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        old_refresh_token = login_response.data['refresh']

        # Refresh
        refresh_response = api_client.post('/api/auth/jwt/refresh/', {
            'refresh': old_refresh_token
        })

        assert refresh_response.status_code == 200
        assert 'refresh' in refresh_response.data
        new_refresh_token = refresh_response.data['refresh']

        # New refresh token should be different (rotation)
        assert new_refresh_token != old_refresh_token

    def test_old_refresh_token_blacklisted_after_rotation(self, api_client, owner_user):
        """Old refresh token should be blacklisted after rotation"""
        # Login
        login_response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        old_refresh_token = login_response.data['refresh']

        # Refresh once
        api_client.post('/api/auth/jwt/refresh/', {
            'refresh': old_refresh_token
        })

        # Try to use old refresh token again - should fail
        second_refresh_response = api_client.post('/api/auth/jwt/refresh/', {
            'refresh': old_refresh_token
        })

        assert second_refresh_response.status_code == 401
        # Token should be in blacklist


@pytest.mark.django_db
class TestJWTLogout:
    """Test JWT logout and token blacklisting"""

    def test_logout_blacklists_refresh_token(self, api_client, owner_user):
        """Logout should blacklist refresh token"""
        # Login
        login_response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        refresh_token = login_response.data['refresh']
        access_token = login_response.data['access']

        # Logout
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = api_client.post('/api/auth/jwt/logout/', {
            'refresh': refresh_token
        })

        assert logout_response.status_code == 200
        assert 'Logout successful' in str(logout_response.data)

        # Try to refresh with blacklisted token - should fail
        refresh_response = api_client.post('/api/auth/jwt/refresh/', {
            'refresh': refresh_token
        })

        assert refresh_response.status_code == 401

    def test_logout_requires_authentication(self, api_client):
        """Logout endpoint should require authentication"""
        response = api_client.post('/api/auth/jwt/logout/', {
            'refresh': 'fake.token'
        })

        assert response.status_code == 401

    def test_logout_with_invalid_refresh_token(self, api_client, owner_user):
        """Logout should fail gracefully with invalid token"""
        # Login to get access token
        login_response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        access_token = login_response.data['access']

        # Try to logout with invalid refresh token
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = api_client.post('/api/auth/jwt/logout/', {
            'refresh': 'invalid.token.here'
        })

        assert logout_response.status_code == 400
        assert 'Invalid token' in str(logout_response.data)


@pytest.mark.django_db
class TestJWTTokenExpiration:
    """Test JWT token expiration behavior"""

    def test_access_token_has_expiration_claim(self, owner_user):
        """Access token should have expiration claim"""
        refresh = RefreshToken.for_user(owner_user)
        access = refresh.access_token

        # Should have 'exp' claim
        assert 'exp' in access.payload

        # Expiration should be ~30 days from now
        exp_timestamp = access.payload['exp']
        exp_datetime = timezone.datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        now = timezone.now()

        # Should expire in 29-31 days
        days_until_expiration = (exp_datetime - now).days
        assert 29 <= days_until_expiration <= 31

    def test_refresh_token_has_expiration_claim(self, owner_user):
        """Refresh token should have expiration claim"""
        refresh = RefreshToken.for_user(owner_user)

        # Should have 'exp' claim
        assert 'exp' in refresh.payload

        # Expiration should be ~90 days from now
        exp_timestamp = refresh.payload['exp']
        exp_datetime = timezone.datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        now = timezone.now()

        # Should expire in 89-91 days
        days_until_expiration = (exp_datetime - now).days
        assert 89 <= days_until_expiration <= 91


@pytest.mark.django_db
class TestBackwardsCompatibility:
    """Test that old Token authentication still works during migration"""

    def test_old_token_auth_still_works(self, api_client, owner_user):
        """Old Token authentication should still work alongside JWT"""
        # Login with old endpoint
        response = api_client.post('/api/auth/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })

        assert response.status_code == 200
        assert 'token' in response.data  # Old format

        # Old token should work for authentication
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {response.data["token"]}')
        company_response = api_client.get('/api/company/')

        assert company_response.status_code != 401

    def test_jwt_and_token_auth_coexist(self, api_client, owner_user):
        """Both JWT and Token authentication should work simultaneously"""
        # JWT login
        jwt_response = api_client.post('/api/auth/jwt/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        jwt_token = jwt_response.data['access']

        # Old token login
        token_response = api_client.post('/api/auth/login/', {
            'email': owner_user.email,
            'password': 'testpass123!'
        })
        old_token = token_response.data['token']

        # Both should authenticate
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_token}')
        jwt_auth_response = api_client.get('/api/company/')
        assert jwt_auth_response.status_code != 401

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {old_token}')
        token_auth_response = api_client.get('/api/company/')
        assert token_auth_response.status_code != 401
