# S01: JWT Auth Backend — UAT

## How to test

### 1. Start the backend
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8001
```

### 2. Test JWT Login
```bash
curl -X POST http://127.0.0.1:8001/api/manager/auth/jwt/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "your_manager_email", "password": "your_password"}'
```

**Expected:** Response contains `access`, `refresh`, `user_id`, `email`, `full_name`, `role`.

### 3. Test JWT Refresh
```bash
curl -X POST http://127.0.0.1:8001/api/manager/auth/jwt/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN_FROM_STEP_2"}'
```

**Expected:** New `access` and `refresh` tokens returned.

### 4. Test JWT Logout
```bash
curl -X POST http://127.0.0.1:8001/api/manager/auth/jwt/logout/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN"}'
```

**Expected:** 200 OK. The refresh token is now blacklisted.

### 5. Verify old Token auth still works
```bash
curl http://127.0.0.1:8001/api/manager/company/ \
  -H "Authorization: Token YOUR_EXISTING_TOKEN"
```

**Expected:** 200 OK with company data (proves Token auth is unbroken).

### 6. Run automated tests
```bash
cd backend
source venv/bin/activate
python -m pytest tests/test_jwt_auth.py -v
```

**Expected:** 19/19 tests pass.
