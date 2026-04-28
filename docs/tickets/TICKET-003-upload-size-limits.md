# TICKET-003 — Add global file upload size limits

## Контекст

В `backend/config/settings.py` нет настроек `DATA_UPLOAD_MAX_MEMORY_SIZE` и `FILE_UPLOAD_MAX_MEMORY_SIZE`. Это значит что Django использует default `2.5MB` для in-memory parsing — но для multipart uploads с большими файлами это просто триггерит TemporaryFileUploadHandler без верхнего лимита. Атакующий может отправить 10GB файл и заполнить диск.

Лимит 10MB реализован только в одном месте: `apps/api/views_maintenance.py:4649` для maintenance документов. Для job photos, asset photos, logo upload — нет проверки.

Также nginx config (`nginx/conf.d/`) может не иметь `client_max_body_size` или иметь его слишком большим.

## Что делаем

### 1. `backend/config/settings.py`

Добавить блок (искать подходящее место — рядом с `MEDIA_URL` или после `STORAGES` секции):

```python
# =============================================================================
# Upload Limits (TICKET-003)
# =============================================================================
# Hard ceilings on request body size to prevent disk-fill DoS.
# Individual views may enforce stricter limits (e.g. 10MB for documents).

# Maximum size of a request body that will be loaded into memory (in bytes).
# Larger requests are streamed to TemporaryFileUploadHandler.
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5 MB

# Maximum size of the entire request body (form data + files).
# Requests larger than this are rejected with HTTP 413 by Django.
DATA_UPLOAD_MAX_MEMORY_SIZE = 25 * 1024 * 1024  # 25 MB

# Maximum number of fields/files in a single multipart request.
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000
DATA_UPLOAD_MAX_NUMBER_FILES = 50
```

**Объяснение значений:**
- `25 MB` для всего запроса — фотографии EXIF могут быть тяжёлыми с iPhone, оставляем запас
- `5 MB` для in-memory — стандартное безопасное значение
- `50` файлов — для bulk upload checklists/photos должно хватить

### 2. `nginx/conf.d/cleanproof.conf` (или как там называется основной conf)

Найти секцию `server { ... }` и добавить (если ещё нет):
```nginx
# TICKET-003: hard limit on request body size (matches Django DATA_UPLOAD_MAX_MEMORY_SIZE)
client_max_body_size 25M;
```

Если такая директива уже есть — проверить значение, поправить на `25M` если оно больше.

Если есть отдельные `location` блоки для `/api/` upload endpoints, и в них определён более низкий лимит — оставить как есть, не повышать.

## Файлы которые можно трогать

- `backend/config/settings.py`
- `nginx/conf.d/*.conf` (nginx-конфиги)

## Anti-scope (не трогать)

- НЕ менять существующий 10MB лимит в `views_maintenance.py` — он работает и стрикчер чем глобальный
- НЕ добавлять валидацию file size в каждый view (это отдельный тикет про MIME validation)
- НЕ трогать `STORAGES`, S3 настройки
- НЕ трогать throttle rates

## Тест который надо добавить

Создать `backend/tests/test_upload_limits.py`:

```python
import pytest
from django.conf import settings


class TestUploadLimitsConfig:
    """TICKET-003: global upload limits must be configured in settings."""

    def test_data_upload_max_memory_size_is_set(self):
        assert hasattr(settings, "DATA_UPLOAD_MAX_MEMORY_SIZE")
        assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE > 0
        # Sanity: should not be larger than 100 MB (we expect ~25 MB)
        assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE <= 100 * 1024 * 1024

    def test_file_upload_max_memory_size_is_set(self):
        assert hasattr(settings, "FILE_UPLOAD_MAX_MEMORY_SIZE")
        assert settings.FILE_UPLOAD_MAX_MEMORY_SIZE > 0

    def test_max_number_fields_is_capped(self):
        assert hasattr(settings, "DATA_UPLOAD_MAX_NUMBER_FIELDS")
        assert settings.DATA_UPLOAD_MAX_NUMBER_FIELDS <= 10000


@pytest.mark.django_db
class TestUploadLimitsEnforcement:
    """TICKET-003: oversized requests must be rejected by Django."""

    def test_oversized_request_body_rejected(self, client, django_user_model):
        """A request body larger than DATA_UPLOAD_MAX_MEMORY_SIZE must be rejected."""
        from django.conf import settings as dj_settings

        # Build a payload larger than the limit
        oversized_payload = "x" * (dj_settings.DATA_UPLOAD_MAX_MEMORY_SIZE + 1024)

        # Use a public endpoint that accepts POST (login is fine, it'll reject before auth)
        response = client.post(
            "/api/auth/login/",
            data=oversized_payload,
            content_type="application/json",
        )
        # Django returns 400 (RequestDataTooBig) for oversized bodies
        assert response.status_code in (400, 413), (
            f"Expected 400/413 for oversized body, got {response.status_code}"
        )
```

## Definition of Done

- [ ] Все 4 settings добавлены в `config/settings.py`
- [ ] nginx config (если меняли) синтаксически валиден
- [ ] Тесты в `test_upload_limits.py` проходят
- [ ] Существующие тесты не ломаются: `pytest tests/test_s05_m009_asset_import_photos.py tests/test_s02_m003_bulk_import.py` зелёный

## Команды верификации

```bash
cd backend
DEBUG=True PYTHONPATH=. pytest tests/test_upload_limits.py -v
DEBUG=True PYTHONPATH=. pytest tests/test_s05_m009_asset_import_photos.py tests/test_s02_m003_bulk_import.py -q --tb=line
```

Если nginx конфиг изменялся — также:
```bash
# проверить синтаксис nginx (если есть docker-compose):
docker compose run --rm nginx nginx -t
# или, если nginx локально установлен:
sudo nginx -t -c $(pwd)/nginx/conf.d/cleanproof.conf
```

Жду output обеих pytest-команд + nginx -t если правили nginx.

## Размер изменений (ожидается)

- `settings.py`: +12 строк (один блок)
- `nginx/conf.d/*.conf`: +1 строка
- Новый тест: ~40 строк
- Никаких миграций
- Никаких изменений зависимостей

## Важное замечание

Если nginx config уже имеет `client_max_body_size 50M` или больше — **снизить до 25M согласованно с Django settings**. Несовпадение может привести к запутанным ошибкам: nginx пропустит, Django отбросит, и пользователь увидит 400 без понятной причины.
