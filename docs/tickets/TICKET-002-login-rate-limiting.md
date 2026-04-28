# TICKET-002 — Apply ScopedRateThrottle to login endpoints

## Контекст

В `backend/config/settings.py` уже определены throttle scopes:
```python
"DEFAULT_THROTTLE_RATES": {
    "anon": "10/minute",
    "auth_login": "5/minute",
    "auth_signup": "3/minute",
    "auth_password_reset": "3/minute",
    ...
}
```

Но они не применяются ни к одному login-view:
- `LoginView` (legacy) — нет throttle вообще
- `JWTManagerLoginView` — использует `[AnonRateThrottle]` без scope, то есть `10/minute` (anon), а не `5/minute` (auth_login)
- `JWTCleanerLoginView` — то же самое
- `CleanerPinLoginView` — нет throttle

Brute-force защита фактически не работает.

## Что делаем

### 1. `backend/apps/api/views_auth.py`

В `LoginView` добавить:
```python
from rest_framework.throttling import ScopedRateThrottle

class LoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"
    ...
```

В `CleanerPinLoginView` — тот же `ScopedRateThrottle` с `throttle_scope = "auth_login"`.

В `ManagerLoginView` (если он там есть и активен) — тот же.

### 2. `backend/apps/api/views_jwt.py`

В `JWTManagerLoginView` заменить:
```python
throttle_classes = [AnonRateThrottle]
```
на:
```python
throttle_classes = [ScopedRateThrottle]
throttle_scope = "auth_login"
```

То же самое для `JWTCleanerLoginView`.

`AnonRateThrottle` импорт можно оставить если используется где-то ещё в файле; если нет — убрать.

### 3. (опционально, если такого ещё нет в коде)

Если в `views_auth.py` есть `ManagerSignupView` — добавить `ScopedRateThrottle` со scope `auth_signup`.
Если есть password reset views — со scope `auth_password_reset`.
**Только если они уже есть в файле**. Не создавать новые views.

## Файлы которые можно трогать

- `backend/apps/api/views_auth.py`
- `backend/apps/api/views_jwt.py`
- `backend/tests/` — добавить тест

## Anti-scope (не трогать)

- НЕ менять значения throttle rates в settings.py (они уже корректны)
- НЕ трогать webhook endpoints (Paddle webhook — отдельная история, у него своя защита через signature)
- НЕ трогать non-auth views
- НЕ удалять существующие тесты login

## Тест который надо добавить

Создать `backend/tests/test_login_rate_limiting.py`:

```python
import pytest
from django.core.cache import cache
from django.urls import reverse


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """Reset throttle counters between tests so they don't poison each other."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestLoginRateLimiting:
    """TICKET-002: login endpoints must enforce auth_login scope (5/min)."""

    def test_legacy_login_rate_limited_after_5_attempts(self, client):
        endpoint = "/api/auth/login/"
        payload = {"email": "x@example.com", "password": "wrong"}

        # First 5 attempts: 401 (invalid credentials)
        for i in range(5):
            response = client.post(endpoint, data=payload, content_type="application/json")
            assert response.status_code == 401, f"Attempt {i+1} unexpectedly status={response.status_code}"

        # 6th attempt should be throttled
        response = client.post(endpoint, data=payload, content_type="application/json")
        assert response.status_code == 429, (
            f"6th attempt expected 429, got {response.status_code}. "
            f"Throttle is not active on /api/auth/login/."
        )

    def test_jwt_manager_login_rate_limited_after_5_attempts(self, client):
        endpoint = "/api/manager/auth/jwt/login/"
        payload = {"email": "x@example.com", "password": "wrong"}

        for i in range(5):
            response = client.post(endpoint, data=payload, content_type="application/json")
            assert response.status_code == 401

        response = client.post(endpoint, data=payload, content_type="application/json")
        assert response.status_code == 429
```

Если URL для JWT manager login отличается — поправить эндпоинт в тесте по факту (см. `apps/api/urls.py`).

## Definition of Done

- [ ] `LoginView`, `CleanerPinLoginView`, `JWTManagerLoginView`, `JWTCleanerLoginView` все используют `ScopedRateThrottle` со scope `auth_login`
- [ ] Тесты `test_login_rate_limiting.py` проходят
- [ ] Существующие тесты `tests/test_jwt_auth.py` всё ещё проходят (важно: внутри тестов нужен сброс кэша, иначе они начнут влиять друг на друга — fixture `_clear_throttle_cache` обязательна)
- [ ] Существующие тесты `tests/test_s01_m003_cleaner_jwt.py` всё ещё проходят

## Команды верификации

```bash
cd backend
DEBUG=True PYTHONPATH=. pytest tests/test_login_rate_limiting.py -v
DEBUG=True PYTHONPATH=. pytest tests/test_jwt_auth.py tests/test_s01_m003_cleaner_jwt.py -q --tb=line
```

Жду output обеих команд.

## Размер изменений (ожидается)

- `views_auth.py`: ~5 строк добавлено
- `views_jwt.py`: ~6 строк изменено
- Новый тест-файл: ~50 строк
- Никаких миграций
- Никаких изменений зависимостей

## Важное замечание

Если в существующих JWT-тестах несколько test cases подряд делают login с одного IP — они могут начать падать с 429 после изменения. Это **ожидаемо и правильно**: throttle работает. Решение — тот же `cache.clear()` fixture в conftest или в каждом тесте login. Если такая проблема возникнет, GSD-2 должен добавить fixture в `conftest.py` или в тест-классы, **не понижать throttle rate**.
