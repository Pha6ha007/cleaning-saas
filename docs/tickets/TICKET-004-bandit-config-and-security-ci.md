# TICKET-004 — Fix security CI: add .bandit config + reorganize security tests

## Контекст

В `.github/workflows/security-checks.yml` есть три проблемы:

1. Workflow вызывает `bandit -c .bandit -r apps/`, но файла `.bandit` в `backend/` нет → шаг падает.
2. Workflow запускает `pytest tests/security/`, но эта папка содержит только заглушку:
   ```python
   # backend/tests/security/test_placeholder.py
   def test_placeholder():
       """Placeholder for security tests."""
       assert True
   ```
   Реальные security-тесты (JWT, RBAC, multi-tenant isolation) разбросаны по другим файлам и в этом workflow **не запускаются**.
3. Существующие тесты помечены маркером `security` в `pytest.ini`:
   ```ini
   markers =
       security: Security-related tests
   ```
   Но **не один тест не использует** этот маркер. Маркер декларирован, но не применён.

Результат: security CI выглядит зелёным («один placeholder прошёл»), но реально не покрывает security.

## Что делаем

### 1. Создать `backend/.bandit`

Стандартный конфиг исключающий тесты и миграции:

```yaml
# backend/.bandit
# Bandit configuration for Proof Platform.
# Docs: https://bandit.readthedocs.io/en/latest/config.html

# Exclude these paths from scanning (test code, migrations, virtualenvs)
exclude_dirs:
  - tests
  - venv
  - .venv
  - env
  - migrations
  - node_modules

# Skip specific Bandit checks that are noisy/false-positive heavy in Django
skips:
  # B101: assert_used — we use assert in tests; production code already excluded
  - B101
  # B311: random — Django uses random for non-crypto purposes (e.g. token cache keys)
  - B311
  # B404, B603: subprocess — we use subprocess intentionally in deploy scripts
  - B404
  - B603
```

### 2. Промаркировать существующие security-relevant тесты

В следующих файлах добавить `pytestmark = pytest.mark.security` на уровне модуля (после импортов):

- `backend/tests/test_jwt_auth.py`
- `backend/tests/test_s01_m003_cleaner_jwt.py`
- `backend/tests/test_s02_jwt_migration.py`
- `backend/tests/test_s03_paddle_webhook.py` (webhook signature verification)
- `backend/tests/test_s04_m006_api_keys.py` (API key auth)
- Любые **новые** тесты из TICKET-001, TICKET-002, TICKET-003

Пример:
```python
# в начале файла после импортов
import pytest

pytestmark = pytest.mark.security
```

**Не помечать** тесты которые проверяют business logic (jobs, analytics, parts) — только тесты, проверяющие **аутентификацию, авторизацию, изоляцию данных, валидацию подписей**.

### 3. Удалить placeholder

`backend/tests/security/test_placeholder.py` — удалить.
Папку `backend/tests/security/` — оставить пустой ли удалить, не важно. Если оставлять, добавить `__init__.py` (он там уже есть).

### 4. Обновить `.github/workflows/security-checks.yml`

В шаге "Run security tests" заменить:
```yaml
- name: Run security tests
  run: |
    pytest tests/security/ -v --cov=apps --cov-report=term-missing
```

на:
```yaml
- name: Run security tests
  run: |
    pytest tests/ -m security -v --cov=apps --cov-report=term-missing
  env:
    DJANGO_SETTINGS_MODULE: config.settings
    SECRET_KEY: test-secret-key-for-ci-only
    DATABASE_URL: sqlite:///test.db
    DEBUG: "True"
```

(Заметь — `DEBUG: "True"` нужен иначе settings.py упадёт на отсутствии `CORS_ORIGINS`.)

Шаг "Run Bandit scan" уже корректный (`bandit -c .bandit -r apps/ -f json`) — после создания `.bandit` он начнёт работать.

## Файлы которые можно трогать

- `backend/.bandit` (создать)
- `backend/tests/test_jwt_auth.py`
- `backend/tests/test_s01_m003_cleaner_jwt.py`
- `backend/tests/test_s02_jwt_migration.py`
- `backend/tests/test_s03_paddle_webhook.py`
- `backend/tests/test_s04_m006_api_keys.py`
- `backend/tests/security/test_placeholder.py` (удалить)
- `.github/workflows/security-checks.yml`

## Anti-scope (не трогать)

- НЕ помечать как `security` тесты, которые тестируют не security (jobs, analytics, reports, parts, и т.д.)
- НЕ менять существующую логику тестов — только добавить module-level `pytestmark`
- НЕ менять Bandit или Safety версии в workflow
- НЕ трогать `ci.yml` или `deploy.yml` — это другие workflows

## Definition of Done

- [ ] `backend/.bandit` создан, содержимое выше
- [ ] `pytestmark = pytest.mark.security` добавлен в указанные тест-файлы
- [ ] `tests/security/test_placeholder.py` удалён
- [ ] `security-checks.yml` обновлён: `pytest tests/ -m security` вместо `pytest tests/security/`
- [ ] Локально: `pytest tests/ -m security -q --tb=line` запускает >30 тестов и все проходят
- [ ] Локально: `pip install bandit==1.8.0 && bandit -c .bandit -r apps/ --severity-level medium` не падает с фатальной ошибкой (high/medium issues могут быть, но это не должно ронять команду — она exit-zero в workflow)

## Команды верификации

```bash
cd backend
# Запустить только security-тесты
DEBUG=True PYTHONPATH=. pytest tests/ -m security -q --tb=line

# Bandit
pip install bandit==1.8.0
bandit -c .bandit -r apps/ --severity-level medium
echo "Bandit exit code: $?"
```

Жду:
- output pytest (последние 20–30 строк включая количество)
- output bandit (полный, включая количество найденных issues)

## Размер изменений (ожидается)

- `.bandit` — новый файл, ~15 строк
- 5 тест-файлов — по 2 строки каждый (импорт pytest + pytestmark)
- 1 удаление (placeholder)
- workflow yaml — ~5 строк изменено
- Никаких миграций
- Никаких изменений зависимостей

## Важное замечание про Bandit findings

Bandit **может найти legitimate findings** — например, в Django проектах часто всплывает:
- B105 (hardcoded_password_string) — false positive на dummy passwords в тестах
- B201 (flask_debug_true) — мы не Flask, не должно быть
- B113 (request_without_timeout) — реальная проблема если найдена

Если Bandit найдёт High severity issues — **не подавлять их в `.bandit`**, а запланировать отдельный тикет на фикс. Сейчас цель — заставить CI работать.
