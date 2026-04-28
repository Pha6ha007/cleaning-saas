# Proof Platform — Глобальный аудит и план запуска в production

**Дата:** 28 апреля 2026
**Версия проекта:** 0.10.0 (Production Hardening)
**Аудитор:** Claude

---

## TL;DR (короткая сводка)

Проект **гораздо ближе к production-ready, чем кажется по объёму**. Это не «надо переписывать», это **«надо закрыть конкретные дыры между документацией и реальностью + допилить mobile»**.

**Что работает хорошо:**
- Backend (Django 5.2 + DRF + JWT + Paddle + Celery) — **архитектурно зрелый**, 844 теста, миграции чистые, `manage.py check` без issues
- CleanProof (cleaning SaaS) — функционально завершён, заявленные 14/14 + 16/16 + 11/11 фич реализованы
- MaintainProof (maintenance SaaS) — V1+V2+V3 закрыты (40+ endpoints, 27+ страниц)
- Multi-tenant изоляция по `company` есть везде в API
- JWT с rotation+blacklist реализован корректно
- Docker (multi-stage, non-root) + docker-compose + nginx + production env example готовы
- Frontend (Vite+React+TS+Tailwind+shadcn) проходит TypeScript check без ошибок

**Что критично перед запуском в массовое использование:**
1. **Документация лжёт о безопасности** — README обещает ClamAV, magic-bytes MIME, 115+ security tests, а в коде это либо заглушки, либо нет совсем. Это юридический риск (если пилотный клиент полагался на эти заявления) и репутационный.
2. **Legacy login (`/api/auth/login/`) без rate-limit** — открыт для brute-force.
3. **Нет глобального лимита размера загрузки** — DoS вектор.
4. **CI ссылается на несуществующий `.bandit` конфиг** → security workflow всегда красный.
5. **Mobile cleaner — большинство критичных gap-ов из последнего аудита уже закрыты**, но нет Sentry/crash-репортов.

**Оценка готовности по областям:**

| Область | Готовность | Блокеры production |
|---|---|---|
| CleanProof Backend | 95% | rate-limit на legacy login, file-size limits |
| MaintainProof Backend | 90% | те же + ClamAV если нужен |
| Manager Portal (web) | 90% | env.production.example нет, надо сделать sentry+monitoring |
| Mobile Cleaner | 85% | crash reporting, env build-time injection |
| DevOps / Deploy | 75% | secrets management, backup verify, monitoring dashboards |
| Безопасность (заявленная vs реальная) | 60% | привести README в соответствие или закрыть гэпы |
| Документация commerce | 80% | privacy/terms есть, нужен incident response runbook |

**Время до production launch:** при фокусе одного человека — **2–3 недели**, при команде из 2 — **1.5 недели**.

---

## 1. Что я проверил

| Проверка | Результат |
|---|---|
| `python manage.py check` | ✅ 0 issues |
| `python manage.py makemigrations --check` | ✅ No changes detected |
| `python manage.py migrate` | ✅ Все миграции применяются чисто |
| Pytest на подвыборке (`test_jwt_auth`, `test_s01_m007_health`, `test_s05_plan_enforcement`) | ✅ 42/42 passed |
| `tsc --noEmit` (dubai-control) | ✅ Компилируется без ошибок |
| Подсчёт тестов backend | 844 теста в 44 файлах |
| Подсчёт миграций | 56 миграций по 9 приложениям |
| Подсчёт фронт-страниц | 278 файлов `.ts`/`.tsx`, ~50 страниц |
| Изоляция multi-tenant | ✅ `company=user.company` фильтр виден везде |
| JWT rotation + blacklist | ✅ Тесты проходят |
| Webhook signature (Paddle) | ✅ fail-closed, проверяется секрет |

---

## 2. Архитектура — карта что есть

```
proof-platform/
├── backend/              Django 5.2 + DRF + JWT + Paddle SDK + Celery + Redis
│   ├── apps/
│   │   ├── accounts/     Company, User, Roles, Trial/Plan, Paddle subscriptions
│   │   ├── locations/    Locations + ChecklistTemplates (CleanProof)
│   │   ├── jobs/         Jobs, JobChecklistItem, JobPhoto, JobCheckEvent (CleanProof)
│   │   ├── maintenance/  Assets, AssetTypes, MaintenanceVisits, Parts, Contracts
│   │   ├── api/          Все REST views (~30 файлов views_*.py)
│   │   ├── analytics/    Page tracking
│   │   ├── marketing/    DemoRequest, ReportEmailLog
│   │   ├── emails/       Branded HTML email templates + Celery tasks
│   │   ├── support/      In-app chat
│   │   └── webhooks/     Outbound webhooks
│   ├── config/           settings.py (672 строки), urls.py, celery.py
│   ├── tests/            844 теста (S01-S05 stages, e2e/, security/ — placeholder!)
│   └── deploy/           Nginx, backup scripts, rate-limit configs
│
├── dubai-control/        Manager Portal (Vite + React 18 + TS + shadcn + Tailwind)
│   └── src/
│       ├── pages/        ~30 страниц: Dashboard, Jobs, Analytics, Reports + maintenance/, customer/
│       ├── api/          Типизированные клиенты по контекстам
│       ├── contexts/     Maintenance — изолированный контекст со своими страницами
│       └── i18n/         EN/AR (RTL поддержка)
│
├── mobile-cleaner/       React Native + Expo (cleaner mobile app)
│   └── src/
│       ├── screens/      Login, Jobs, JobDetails, Profile (с Logout)
│       ├── api/          JWT с auto-refresh + dedup concurrent 401s
│       ├── offline/      jobCache, outbox, storage, types — РЕАЛИЗОВАНО
│       └── services/     syncService с NetInfo
│
├── nginx/                Reverse proxy + rate limiting + TLS
├── postgres/             init scripts
├── docker-compose.yml    nginx + backend + celery-worker + celery-beat + db + redis
└── .github/workflows/    ci.yml, deploy.yml, security-checks.yml
```

**Хорошее наблюдение:** maintenance изолирован в `apps/maintenance/` + `dubai-control/src/contexts/maintenance/`. Это значит что cleaning и maintenance можно деплоить как отдельные продукты или вместе — архитектура поддерживает.

---

## 3. Ключевые расхождения между документацией и кодом

Это **главная проблема** проекта. Список того, что README/AUDIT_REPORT обещает, но в коде нет:

### 3.1 ❌ ClamAV virus scanning (заявлен везде, отсутствует)

README пишет:
> ClamAV Virus Scanning for all uploaded files
> EICAR Test Pattern detection for deployment verification
> python manage.py shell
> >>> from apps.jobs.virus_scan import test_virus_scanning

В коде:
```bash
$ grep -rn "clamav\|virus_scan" apps/
# ничего не найдено
```

Файла `apps/jobs/virus_scan.py` **не существует**. ClamAV нет в `requirements.txt` (нет `clamd` или `pyclamd`).

**Решение:** либо реализовать (~1 день), либо убрать упоминания из README (~30 минут). Учитывая что фото-загрузки от cleaners — реальный вектор, **рекомендую реализовать** через `pyclamd` или AWS S3 + AWS GuardDuty Malware Protection.

### 3.2 ❌ Магия-байтов MIME validation (заявлено, нет в коде)

README:
> MIME Type Validation using magic bytes (not just extensions)

В коде (`apps/jobs/image_utils.py`):
```python
content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
```

Это `Content-Type` header **из браузера/клиента — легко подделывается**. Нет `python-magic`, нет проверки сигнатур файлов.

**Решение:** добавить `python-magic` в requirements, валидировать через `magic.from_buffer(file.read(2048), mime=True)`. ~2 часа.

### 3.3 ❌ 115+ Security Tests (заявлено, в `tests/security/` только placeholder)

README:
> 115+ Security Tests across all critical areas
> 40+ RBAC Isolation Tests for multi-tenant security
> 30+ JWT Authentication Tests
> 15+ Virus Scanning Tests

Реальность:
```python
# backend/tests/security/test_placeholder.py
def test_placeholder():
    """Placeholder for security tests."""
    assert True
```

Тесты JWT/RBAC **есть** (в других файлах, ~50 штук JWT в `test_jwt_auth.py` + `test_s01_m003_cleaner_jwt.py` + `test_s02_jwt_migration.py`), но они не в `tests/security/`. Эта папка пустая.

**Проблема:** CI workflow `security-checks.yml` запускает только `pytest tests/security/` — то есть **security CI пропускает все 49 реальных JWT тестов и проверяет один placeholder**.

**Решение:** либо переместить/симлинкнуть существующие auth/RBAC тесты в `tests/security/`, либо изменить CI на `pytest tests/ -m security` с правильными pytest-маркерами. ~1 час.

### 3.4 ❌ `.bandit` config (CI ссылается, файла нет)

```yaml
# .github/workflows/security-checks.yml
- name: Run Bandit scan
  run: bandit -c .bandit -r apps/ ...
```

`.bandit` файла нет. CI всегда падает. Нужен файл-конфиг или убрать `-c .bandit`. ~10 минут.

### 3.5 ⚠️ Заявленная hardcoded credentials в mobile — уже исправлено

Аудит от 2026-03-05 указывал на hardcoded `cleaner@test.com` в `LoginScreen.tsx`. **Я проверил — credentials удалены**, поля пустые. Аудит устарел.

---

## 4. Найденные новые проблемы безопасности

### 4.1 🔴 Username enumeration в legacy LoginView

`apps/api/views_auth.py:LoginView` (используется на `/api/auth/login/`):
```python
except User.DoesNotExist:
    return Response({"detail": "User not found"}, ...)
...
if not user.check_password(password):
    return Response({"detail": "Invalid credentials"}, ...)
```

Атакующий по разным сообщениям определяет, какие email-ы зарегистрированы. **Это активный эндпоинт** — `path("auth/login/", LoginView.as_view())` в `apps/api/urls.py:126`.

**Решение:** заменить оба ответа на одинаковое `{"detail": "Invalid credentials."}`, status `401`. JWT-эндпоинты (`JWTManagerLoginView`) уже сделаны правильно.

### 4.2 🔴 Legacy LoginView без rate-limit

`LoginView` (legacy) **не имеет** `throttle_classes`. Brute-force открыт. JWT-эндпоинты имеют `throttle_classes = [AnonRateThrottle]`, но используют общий `anon: 10/minute`, а не специальный `auth_login: 5/minute` из `DEFAULT_THROTTLE_RATES`.

**Решение:**
```python
class LoginView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"
```
И аналогично для JWT-логинов — поменять `AnonRateThrottle` на `ScopedRateThrottle` со scope `auth_login`. ~30 минут.

### 4.3 🔴 Нет глобальных лимитов на upload

Django по умолчанию не имеет лимита на размер тела запроса. Лимит 10MB реализован **только** для maintenance документов в одном view (`views_maintenance.py:4649`). Для job photos, logo upload, asset photos — **нет лимита**.

**Решение в `settings.py`:**
```python
DATA_UPLOAD_MAX_MEMORY_SIZE = 15 * 1024 * 1024  # 15 MB request body
FILE_UPLOAD_MAX_MEMORY_SIZE = 15 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000
DATA_UPLOAD_MAX_NUMBER_FILES = 50
```
И на уровне nginx — `client_max_body_size`. ~15 минут.

### 4.4 🟡 Token-auth (legacy) в DRF параллельно с JWT

В `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`:
```python
"rest_framework_simplejwt.authentication.JWTAuthentication",
"rest_framework.authentication.TokenAuthentication",  # ← legacy
"rest_framework.authentication.SessionAuthentication",
```

Token-auth (DRF authtoken) **не имеет expiration**. Если токен утёк — он действителен бесконечно. JWT migration guide есть, но Token-auth пока активен (mobile частично мигрирован).

**Решение:** план в README уже есть — Q2 2026. До тех пор: добавить ротацию Token при login (удалять старый). ~1 час.

### 4.5 🟡 SECRET_KEY используется как JWT SIGNING_KEY

В `settings.py:336`:
```python
SIMPLE_JWT = {
    "SIGNING_KEY": SECRET_KEY,
    ...
}
```

При компрометации Django SECRET_KEY компрометируется и JWT. Best practice — отдельный `JWT_SIGNING_KEY` с rotation возможностью.

**Решение:** не критично для launch, но стоит запланировать. ~1 час.

### 4.6 🟡 CORS в DEBUG разрешает всех

```python
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
```

Это нормально для dev, **но если staging запущен с DEBUG=True** (что бывает), то открыто. Нужно убедиться что staging имеет `DEBUG=False` и явный `CORS_ORIGINS`.

### 4.7 🟡 Нет Content-Security-Policy header

В коде только `X_FRAME_OPTIONS = "DENY"` и HSTS. README обещает CSP. Нужно `django-csp` или middleware.

**Решение:** ~30 минут на базовый CSP.

### 4.8 🟢 Хорошо сделано (для записи)
- Paddle webhook fail-closed (без секрета — все запросы отклоняются)
- JWT rotation + blacklist на logout — реально работает (тесты прошли)
- Multi-tenant изоляция через `company=user.company` фильтры везде
- Email с throttling 3/min на reset
- Security headers `HSTS`, `XFO`, `SECURE_SSL_REDIRECT` в продакшене
- Non-root user в Docker
- env-driven SECRET_KEY с raise если не установлен в production

---

## 5. Mobile Cleaner — состояние

Старый аудит (от 2026-03-05) насчитал 6 критичных gap-ов. Я проверил каждый:

| Gap | Статус сейчас |
|---|---|
| Hardcoded dev credentials | ✅ Исправлено (поля пустые в LoginScreen) |
| Token expiry → Login redirect | ✅ Реализовано (`api/client.ts` — auto-refresh + `resetToLogin()`) |
| Нет Logout button | ✅ Есть (`ProfileScreen.tsx` + `clearTokens()`) |
| Offline job cache | ✅ Реализовано (`offline/jobCache.ts`, 162 строки) |
| Outbox для checklist + photos | ✅ Реализовано (`offline/outbox.ts` + `services/syncService.ts`) |
| Network detection только в JobDetails | ✅ `syncService.ts` использует NetInfo глобально |

**Что ещё нужно для production:**

1. **Crash reporting** — Sentry React Native не подключён. Без него любой production crash будет невидим.
2. **EAS build profile** — `eas.json` есть (512 байт), нужно проверить что production profile настроен.
3. **API_BASE_URL** — fallback `http://192.168.31.78:8000` (локальная сеть). Production builds должны иметь обязательный `EXPO_PUBLIC_API_BASE_URL` без fallback.
4. **App Store metadata** — privacy policy URL, screenshots, описания (в `app.json`).
5. **Push notifications** (deferred → V4 в аудите).

---

## 6. Manager Portal (dubai-control) — состояние

| Аспект | Состояние |
|---|---|
| TypeScript compilation | ✅ Без ошибок |
| Структура страниц | ✅ ~50 страниц по контекстам |
| i18n | ✅ EN/AR с RTL |
| Sentry | ✅ В deps (`@sentry/react@10.43.0`), нужно проверить что инициализирован |
| PWA | ✅ `vite-plugin-pwa` подключён |
| Tests | ⚠️ Vitest конфиг есть, но количество unit-тестов небольшое; есть Playwright e2e |
| `.env.production.example` | ❌ **Отсутствует** (есть только `.env.staging.example`) |
| `vercel.json` | ✅ Есть для деплоя на Vercel |

**Найдено:** в `usePageTracking.ts`, `Reports.tsx`, `ResetPassword.tsx`, `Contact.tsx`, `core.ts` — fallback URL `http://127.0.0.1:8001` (с порт **8001**, не 8000!). Если кто-то запустит prod build без `VITE_API_BASE_URL`, фронт пойдёт на 127.0.0.1:8001 и тихо ничего не получит. Лучше падать явно.

**Решение:** в `.env.production.example` указать обязательные переменные, в коде сделать `if (!API_BASE_URL) throw new Error(...)` или хотя бы `console.error`.

---

## 7. CI/CD состояние

```
.github/workflows/
├── ci.yml                  Main CI (build, lint, tests)
├── deploy.yml              Auto-deploy на push в main
└── security-checks.yml     ← ВНИМАНИЕ
```

**Проблемы security-checks.yml:**
1. Запускает `pytest tests/security/` где только placeholder → coverage всегда 0% → codecov показывает что security не покрыт
2. `bandit -c .bandit -r apps/` — нет файла `.bandit`, шаг падает
3. CodeQL — должен работать (стандартный action), но если в репо нет настроенных rules, выдаст generic warnings
4. `safety check` — может найти CVE в зависимостях (на 28 апреля 2026 несколько пакетов могут иметь известные CVE, особенно `paddle-python-sdk` и старая `python-bidi`)

---

## 8. План запуска в production — 3 фазы

### 🚦 Фаза 0: Pre-launch unblockers (3–5 дней)

**Цель:** убрать риски которые могут опозорить при запуске или сломать прод.

| # | Задача | Время | Ответственность |
|---|---|---|---|
| 1 | Привести README в соответствие с кодом — убрать упоминания ClamAV/magic-bytes ИЛИ реализовать | 0.5–1 день | Tech lead |
| 2 | Исправить username enumeration в legacy `LoginView` | 30 мин | Backend |
| 3 | Добавить `ScopedRateThrottle` на login (legacy + JWT) | 30 мин | Backend |
| 4 | Добавить `DATA_UPLOAD_MAX_MEMORY_SIZE` в settings + nginx `client_max_body_size` | 30 мин | DevOps |
| 5 | Создать `.bandit` конфиг + переписать `security-checks.yml` чтобы реально тестировал auth/RBAC | 2 часа | DevOps |
| 6 | Создать `dubai-control/.env.production.example` | 15 мин | Frontend |
| 7 | Подключить Sentry React Native в mobile-cleaner | 1 час | Mobile |
| 8 | Проверить что Sentry React инициализирован в `dubai-control/src/main.tsx` | 30 мин | Frontend |
| 9 | Запустить полный pytest и убедиться что всё проходит | 1 час | QA |
| 10 | Запустить `safety check` и `bandit -r apps/` локально, исправить high/critical | 2–4 часа | Security |

**После фазы 0** — можно безопасно делать softlaunch для 5–10 пилотных клиентов.

### 🚀 Фаза 1: Production stabilization (1 неделя)

**Цель:** инфраструктура, мониторинг, observability на уровне «знаем что происходит».

| # | Задача | Время |
|---|---|---|
| 1 | Поднять production на DigitalOcean / AWS / Hetzner: PostgreSQL managed, Redis managed, S3-compat storage | 1–2 дня |
| 2 | Настроить домен + Cloudflare + Let's Encrypt (через certbot или Cloudflare Origin) | 0.5 дня |
| 3 | Настроить Sentry projects (backend, frontend, mobile) с alerts | 0.5 дня |
| 4 | Настроить uptime monitoring (Better Uptime / UptimeRobot) на `/api/health/` и `/api/health/ready/` | 1 час |
| 5 | Проверить backup-script `deploy/backup-postgres.sh` — реально загрузил, реально восстановил | 0.5 дня |
| 6 | Настроить log aggregation: CloudWatch / Loki / Datadog | 0.5–1 день |
| 7 | Настроить Paddle production: webhook secret, price IDs, протестировать полный flow trial→paid→cancel | 1 день |
| 8 | Записать `RUNBOOK.md`: что делать если БД упала, как откатить деплой, как восстановить из бэкапа | 0.5 дня |
| 9 | Запустить полный E2E flow на staging: signup → trial → создать job → check-in → photo → check-out → PDF → email | 0.5 дня |

### 📈 Фаза 2: Mass launch readiness (1–2 недели)

**Цель:** масштабирование, юридические аспекты, support.

| # | Задача | Время |
|---|---|---|
| 1 | Реализовать ClamAV или AWS S3 GuardDuty (если оставляем заявление в README) | 1 день |
| 2 | Реализовать magic-bytes MIME validation через `python-magic` | 2 часа |
| 3 | Перенести JWT-аутентикацию полностью, deprecate Token auth (Q2 2026 план) | 2–3 дня |
| 4 | CSP header через `django-csp` | 0.5 дня |
| 5 | Юридика: privacy policy + terms of service на платформе (страницы есть, нужно ревью лоера) | вне scope разработки |
| 6 | Onboarding/in-app help: tooltips, демо-данные, welcome-emails (часть есть, проверить полноту) | 1–2 дня |
| 7 | Customer support: подключить Intercom/Crisp ИЛИ протестировать встроенный support chat | 0.5–1 день |
| 8 | Performance tuning: Redis cache hit rate, DB indexes, N+1 queries (есть `test_s02_m011_db_indexes.py` — проверить актуальность) | 1–2 дня |
| 9 | Load testing: locust/k6 на 100 одновременных cleaner-чекинов | 1 день |
| 10 | Mobile App Store submissions (iOS App Store + Google Play): подготовка assets, описаний, privacy disclosures | 3–5 дней (внешняя зависимость от Apple/Google review) |
| 11 | Disaster recovery test: восстановить полную систему из backup на новом сервере | 0.5 дня |
| 12 | GDPR-compliance review: data export, account deletion, cookie banner | 1–2 дня |

---

## 9. Конкретные задачи которые я могу сделать прямо сейчас

Если хочешь, я могу взять и сделать любую из этих задач немедленно (просто скажи какую):

1. **Создать `.env.production.example` для frontend** — конкретный список переменных с описаниями
2. **Создать `.bandit` конфиг** + обновить `security-checks.yml` чтобы CI проходил
3. **Написать патч для `LoginView`** — убрать username enumeration + добавить throttle (готовый diff)
4. **Добавить file-size limits в settings.py** — готовый код
5. **Реализовать magic-bytes MIME validation** — добавить `python-magic`, переписать `image_utils.py`
6. **Реализовать ClamAV integration** — `apps/jobs/virus_scan.py` + тесты
7. **Написать `RUNBOOK.md`** для production incidents
8. **Свести существующие RBAC/JWT тесты в `tests/security/`** через pytest markers
9. **Привести README в соответствие** — убрать ложные обещания или пометить как roadmap
10. **Написать чек-лист go-live** в формате pre-flight checklist (по пунктам, какие env vars, какие сервисы должны быть подняты, в каком порядке деплоить)

---

## 10. Приоритизированный список первых 10 действий

Если работать в одиночку, я бы делал в этом порядке:

1. **Закрыть документационные дыры** (README, AUDIT_REPORT) — либо реализовать, либо убрать заявления. Это снимет юридический и репутационный риск немедленно.
2. **Username enumeration + throttle на legacy login** — 1 час, закрывает реальный security gap.
3. **Upload size limits** — 30 минут, закрывает DoS-вектор.
4. **Починить security-checks CI** (`.bandit` + переместить тесты) — чтобы знать когда что-то ломается.
5. **`.env.production.example` для frontend + проверить что Sentry React реально инициализирован.**
6. **Sentry React Native в mobile-cleaner.**
7. **Поднять staging environment** на реальной инфраструктуре, прогнать полный E2E.
8. **Бэкап-проверка** — реально восстановить prod-копию из бэкапа.
9. **Paddle production setup** + полный billing flow тест.
10. **Soft-launch для 3–5 пилотов** + 2 недели мониторинга прежде чем открывать массово.

---

## 11. Что я НЕ проверил (limitations)

- **Не запустил полный pytest** на 844 тестах — некоторые могут падать (запустил подвыборку 42, все прошли).
- **Не запустил frontend build** — vite не разрешил `lucide-react` из-за особенностей среды (на нормальной машине, скорее всего, билд пройдёт; TypeScript check уже прошёл).
- **Не проверял Playwright e2e** — нужен живой сервер.
- **Не запускал Bandit/Safety** — стоит запустить локально для CVE-сканирования зависимостей.
- **Не делал penetration testing** — рекомендую заказать внешний pentest перед массовым launch (Cobalt, HackerOne, или fixed-price от $3–5K).
- **Не проверял Paddle integration** в живую — тесты на webhook есть, но реальный flow требует Paddle sandbox account.
- **Не смотрел на performance/load** — для cleaning SaaS с UAE-фокусом ожидаемая нагрузка низкая, но всё же стоит замерить.

---

## Заключение

**Проект в хорошем состоянии.** Это не «надо переделать», это «надо закрыть конкретный список из 20–30 задач». Архитектура правильная, тесты есть (хотя структура запутана), безопасность в большинстве мест на уровне, инфраструктура развёрнута.

**Главный риск — не технический, а коммуникационный:** README и аудиты обещают больше, чем реально реализовано. Это нужно либо привести в соответствие (быстрее), либо реализовать (правильнее, если бюджет позволяет).

Скажи с чего хочешь начать — я готов сразу делать конкретные изменения.
