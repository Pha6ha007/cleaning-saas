# JWT Migration Guide (PR4: Token Security)

## Overview

The Proof Platform is migrating from legacy Token authentication to JWT (JSON Web Tokens) for improved security:

- **Access tokens** expire after 30 days
- **Refresh tokens** expire after 90 days
- Token rotation prevents replay attacks
- Logout blacklists refresh tokens

## Migration Strategy

### Phase 1: Dual Authentication (Current)

Both old Token and new JWT authentication work simultaneously:

- **Old endpoints**: `/api/auth/login/` (returns `token`)
- **New endpoints**: `/api/auth/jwt/login/` (returns `access` + `refresh`)

This allows gradual frontend migration without breaking existing clients.

### Phase 2: JWT Migration (1-2 weeks)

Migrate frontend to use JWT endpoints:

1. Update login to use `/api/auth/jwt/login/`
2. Store both `access` and `refresh` tokens
3. Add token refresh logic
4. Update logout to use `/api/auth/jwt/logout/`

### Phase 3: Deprecation (1 month after)

- Mark old endpoints as deprecated
- Log warnings when old endpoints used
- Monitor usage metrics

### Phase 4: Removal (3 months after)

- Remove old Token authentication
- Delete legacy endpoints

---

## Frontend Implementation

### 1. Login

**Old (Token):**
```typescript
// POST /api/auth/login/
{
  email: "user@example.com",
  password: "password123"
}

// Response:
{
  token: "abc123...",
  user_id: 1,
  email: "user@example.com",
  full_name: "John Doe",
  role: "owner"
}

// Usage:
localStorage.setItem('token', response.token)
headers: { Authorization: `Token ${token}` }
```

**New (JWT):**
```typescript
// POST /api/auth/jwt/login/
{
  email: "user@example.com",
  password: "password123"
}

// Response:
{
  access: "eyJ0eXAiOiJKV1QiLCJhbGc...",   // Expires in 30 days
  refresh: "eyJ0eXAiOiJKV1QiLCJhbGc...",  // Expires in 90 days
  user_id: 1,
  email: "user@example.com",
  full_name: "John Doe",
  role: "owner"
}

// Storage:
localStorage.setItem('access_token', response.access)
localStorage.setItem('refresh_token', response.refresh)

// Usage:
headers: { Authorization: `Bearer ${accessToken}` }
```

### 2. API Requests with Auto-Refresh

```typescript
// apiClient.ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

// Add access token to requests
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token')
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Auto-refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Refresh tokens
        const refreshToken = localStorage.getItem('refresh_token')
        const { data } = await axios.post('/api/auth/jwt/refresh/', {
          refresh: refreshToken
        })

        // Store new tokens
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
```

### 3. Logout

**Old (Token):**
```typescript
// No server-side logout
localStorage.removeItem('token')
```

**New (JWT):**
```typescript
// POST /api/auth/jwt/logout/
{
  refresh: localStorage.getItem('refresh_token')
}

// Client:
await api.post('/api/auth/jwt/logout/', {
  refresh: localStorage.getItem('refresh_token')
})

localStorage.removeItem('access_token')
localStorage.removeItem('refresh_token')
```

### 4. Token Refresh (Manual)

```typescript
// POST /api/auth/jwt/refresh/
{
  refresh: "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

// Response:
{
  access: "eyJ0eXAiOiJKV1QiLCJhbGc...",   // New access token
  refresh: "eyJ0eXAiOiJKV1QiLCJhbGc..."  // New refresh token (rotation)
}
```

**Note:** Old refresh token is blacklisted after successful refresh (rotation).

---

## Backend Endpoints

### JWT Endpoints (New)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/jwt/login/` | POST | None | Login with email+password → JWT tokens |
| `/api/auth/jwt/cleaner-login/` | POST | None | Cleaner login with phone+PIN → JWT tokens |
| `/manager/auth/jwt/login/` | POST | None | Manager/owner login → JWT tokens |
| `/api/auth/jwt/refresh/` | POST | None | Refresh access token (rotates refresh token) |
| `/api/auth/jwt/logout/` | POST | Bearer | Blacklist refresh token |

### Legacy Endpoints (Deprecated)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/auth/login/` | POST | ⚠️ Deprecated (use JWT) |
| `/api/auth/cleaner-login/` | POST | ⚠️ Deprecated (use JWT) |
| `/manager/auth/login/` | POST | ⚠️ Deprecated (use JWT) |

---

## Security Best Practices

### Token Storage

✅ **Recommended:**
- Store `access_token` and `refresh_token` in `localStorage` (web)
- Store in secure storage on mobile (Keychain/Keystore)

❌ **Avoid:**
- Storing tokens in cookies (CSRF risk without proper setup)
- Storing tokens in URL parameters
- Logging tokens to console

### Token Expiration Handling

✅ **Do:**
- Implement auto-refresh interceptor (see example above)
- Handle refresh failures gracefully (redirect to login)
- Clear tokens on logout

❌ **Don't:**
- Ignore 401 errors
- Retry failed requests without refreshing token
- Keep expired tokens in storage

### Security Notes

1. **Access token cannot be blacklisted** (stateless JWT)
   - Remains valid until expiration (30 days)
   - Logout only blacklists refresh token
   - If token leaked, change user password to force logout

2. **Refresh token rotation**
   - New refresh token issued on each refresh
   - Old refresh token blacklisted automatically
   - Prevents replay attacks

3. **HTTPS required in production**
   - JWT tokens are bearer tokens
   - Must use HTTPS to prevent interception

---

## Testing Migration

### Test Checklist

- [ ] Login with JWT returns access + refresh tokens
- [ ] API requests work with JWT Bearer token
- [ ] Token refresh works and rotates refresh token
- [ ] Old refresh token rejected after rotation
- [ ] Logout blacklists refresh token
- [ ] 401 triggers auto-refresh
- [ ] Refresh failure redirects to login
- [ ] Mobile app handles token storage securely

### Example Test

```typescript
// test-jwt-auth.spec.ts
describe('JWT Authentication', () => {
  it('should login and refresh token', async () => {
    // Login
    const { data: loginData } = await api.post('/api/auth/jwt/login/', {
      email: 'test@example.com',
      password: 'password123'
    })

    expect(loginData.access).toBeDefined()
    expect(loginData.refresh).toBeDefined()

    // Store tokens
    const oldRefresh = loginData.refresh

    // Refresh
    const { data: refreshData } = await api.post('/api/auth/jwt/refresh/', {
      refresh: oldRefresh
    })

    expect(refreshData.access).toBeDefined()
    expect(refreshData.refresh).toBeDefined()
    expect(refreshData.refresh).not.toBe(oldRefresh) // Rotation

    // Old refresh should be blacklisted
    await expect(
      api.post('/api/auth/jwt/refresh/', { refresh: oldRefresh })
    ).rejects.toThrow()
  })
})
```

---

## Rollback Plan

If JWT migration causes issues:

1. **Frontend rollback:**
   ```typescript
   // Switch back to old endpoints
   const endpoint = USE_JWT ? '/api/auth/jwt/login/' : '/api/auth/login/'
   ```

2. **Backend rollback:**
   - Old Token authentication still works
   - No breaking changes to legacy endpoints

3. **Data migration:**
   - No database changes required
   - JWT blacklist tables optional

---

## FAQ

**Q: Do we need to migrate all at once?**
A: No, dual authentication allows gradual migration.

**Q: What happens to existing sessions?**
A: Old Token sessions continue working. Users will migrate on next login.

**Q: Can we use JWT for mobile and Token for web?**
A: Yes, but not recommended. Use JWT for both for consistency.

**Q: How do we handle token expiration on mobile?**
A: Same as web - implement refresh interceptor. Mobile apps can refresh tokens in background.

**Q: What if refresh token expires?**
A: User must login again. 90 days should be sufficient for most use cases.

**Q: Can we reduce token lifetime?**
A: Yes, adjust `SIMPLE_JWT` settings in `config/settings.py`. Consider UX impact.

---

## Support

For questions or issues during migration:
- **Backend:** Check `apps/api/views_auth_jwt.py`
- **Settings:** Check `config/settings.py` SIMPLE_JWT section
- **Tests:** Run `pytest tests/security/test_jwt_pr4.py`
