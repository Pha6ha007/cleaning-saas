# TICKET-001 — Fix username enumeration in legacy LoginView

## Контекст

Файл `backend/apps/api/views_auth.py` содержит `LoginView` (legacy Token-auth login на endpoint `/api/auth/login/`). Этот endpoint всё ещё активен и используется. Проблема: разные сообщения об ошибке для несуществующего пользователя и неверного пароля позволяют атакующему перечислять зарегистрированные email-адреса.

## Что делаем

В `apps/api/views_auth.py` в классе `LoginView` (строки ~15–73) объединить два сценария ошибки в один. Обе ветки (`User.DoesNotExist` и `not user.check_password(password)`) должны возвращать **идентичный** ответ:

```python
return Response(
    {"detail": "Invalid credentials."},
    status=status.HTTP_401_UNAUTHORIZED,
)
```

Также заменить `HTTP_400_BAD_REQUEST` на `HTTP_401_UNAUTHORIZED` для случая отсутствия email/password (для консистентности с JWT login). Текст ошибки для пустого payload оставить прежний.

## Файлы которые можно трогать

- `backend/apps/api/views_auth.py` — только класс `LoginView`
- `backend/tests/` — добавить тест, см. ниже

## Anti-scope (не трогать)

- НЕ трогать `JWTManagerLoginView` или `JWTCleanerLoginView` — они уже корректны
- НЕ трогать `CleanerPinLoginView`, `ManagerLoginView`, signup, password reset
- НЕ менять структуру response (не добавлять новые поля)
- НЕ менять URL
- НЕ удалять `LoginView` (это отдельный тикет про deprecation Token-auth)

## Тест который надо добавить

В подходящий тестовый файл (например, `backend/tests/test_jwt_auth.py` есть `TestJWTLogin`, по аналогии создать `tests/test_legacy_login_security.py` или добавить класс `TestLegacyLoginSecurity` в существующий auth-тест-файл — на усмотрение):

```python
@pytest.mark.django_db
class TestLegacyLoginSecurity:
    """TICKET-001: legacy /api/auth/login/ must not leak user existence."""

    def test_unknown_email_returns_401_invalid_credentials(self, client):
        response = client.post(
            "/api/auth/login/",
            data={"email": "nonexistent@example.com", "password": "anything"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid credentials."}

    def test_known_email_wrong_password_returns_same_response(self, client, django_user_model):
        django_user_model.objects.create_user(
            email="real@example.com", password="correct-password"
        )
        response = client.post(
            "/api/auth/login/",
            data={"email": "real@example.com", "password": "wrong-password"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid credentials."}

    def test_responses_are_indistinguishable(self, client, django_user_model):
        """The two responses must be byte-identical (status + body)."""
        django_user_model.objects.create_user(
            email="real@example.com", password="correct-password"
        )
        unknown = client.post(
            "/api/auth/login/",
            data={"email": "fake@example.com", "password": "x"},
            content_type="application/json",
        )
        wrong_pw = client.post(
            "/api/auth/login/",
            data={"email": "real@example.com", "password": "wrong"},
            content_type="application/json",
        )
        assert unknown.status_code == wrong_pw.status_code
        assert unknown.json() == wrong_pw.json()
```

## Definition of Done

- [ ] Оба сценария ошибки возвращают `{"detail": "Invalid credentials."}` со статусом 401
- [ ] Случай `must_change_password` оставлен без изменений (там код 403, это не утечка)
- [ ] Случай успешного логина оставлен без изменений
- [ ] Добавлены тесты выше
- [ ] Все 3 новых теста проходят
- [ ] Существующие тесты НЕ ломаются: `pytest tests/test_jwt_auth.py tests/test_s01_m003_cleaner_jwt.py` зелёный

## Команды верификации (то что я попрошу прислать)

```bash
cd backend
DEBUG=True PYTHONPATH=. pytest tests/test_legacy_login_security.py -v
DEBUG=True PYTHONPATH=. pytest tests/test_jwt_auth.py tests/test_s01_m003_cleaner_jwt.py -q --tb=line
```

Жду output обеих команд (последние 30–50 строк).

## Размер изменений (ожидается)

- `views_auth.py`: ~5 строк изменено
- Новый тест-файл: ~50 строк
- Никаких миграций
- Никаких изменений зависимостей
