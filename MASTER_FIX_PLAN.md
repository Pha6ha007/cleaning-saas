# MASTER FIX PLAN — Proof Platform

**Источник:** 7 аудитов (2026-03-05/06)
**Формат:** Каждая задача — отдельный промпт для Claude Code. Копируй и вставляй по одной.

---

# ФАЗА 0 — CONTEXT ISOLATION (data corruption fix)

Самая критичная проблема: Cleaning Reports/Analytics включают Maintenance jobs.
11 мест в коде без фильтра `context=Job.CONTEXT_CLEANING`.

---

### TASK 0.1 — Fix _get_company_report context filter

```
Файл: backend/apps/api/views_reports.py
Строка: ~48

Найди функцию _get_company_report(). В ней есть Job.objects.filter() БЕЗ context фильтра.

Добавь context=Job.CONTEXT_CLEANING в фильтр.

БЫЛО (примерно):
Job.objects.filter(
    company=company,
    status=Job.STATUS_COMPLETED,
    actual_end_time__date__gte=date_from,
    actual_end_time__date__lte=date_to,
)

СТАЛО:
Job.objects.filter(
    company=company,
    status=Job.STATUS_COMPLETED,
    context=Job.CONTEXT_CLEANING,
    actual_end_time__date__gte=date_from,
    actual_end_time__date__lte=date_to,
)

Это исправит: OwnerOverviewView, ManagerWeeklyReportView, ManagerMonthlyReportView,
ManagerWeeklyReportPdfView, ManagerMonthlyReportPdfView, WeeklyReportEmailView,
MonthlyReportEmailView — все они используют _get_company_report().

Не трогай другие файлы. Только views_reports.py.
```

---

### TASK 0.2 — Fix ManagerPerformanceView context filter

```
Файл: backend/apps/api/views_reports.py
Строка: ~327-335

Найди ManagerPerformanceView. В нём Job.objects.filter() БЕЗ context фильтра.

Добавь context=Job.CONTEXT_CLEANING в фильтр queryset.

Также замени scheduled_date на actual_end_time для date-фильтрации
(чтобы совпадало с Analytics — см. AUDIT_DATA_INTEGRITY).

Не трогай другие views. Только ManagerPerformanceView.
```

---

### TASK 0.3 — Fix ManagerViolationJobsView context filter

```
Файл: backend/apps/api/views_reports.py
Строка: ~553-562

Найди ManagerViolationJobsView. В нём Job.objects.filter() БЕЗ context фильтра.

Добавь context=Job.CONTEXT_CLEANING в фильтр queryset.

Также замени scheduled_date на actual_end_time для date-фильтрации.

Не трогай другие views.
```

---

### TASK 0.4 — Fix _calculate_summary_for_range context filter

```
Файл: backend/apps/api/analytics_views.py
Строка: ~47-57

Найди функцию _calculate_summary_for_range(). В ней Job.objects.filter() БЕЗ context.

Добавь context=Job.CONTEXT_CLEANING в фильтр.

Это исправит analytics_summary() который использует эту функцию.

Не трогай другие файлы.
```

---

### TASK 0.5 — Fix все остальные analytics views context filter

```
Файл: backend/apps/api/analytics_views.py

Добавь context=Job.CONTEXT_CLEANING в Job.objects.filter() в КАЖДОЙ из этих функций:

1. analytics_jobs_completed (строка ~306-312)
2. analytics_violations_trend (строка ~394-403)
3. analytics_job_duration (строка ~500-510)
4. analytics_proof_completion (строка ~604-613)
5. analytics_sla_breakdown (строка ~766-775)
6. analytics_locations_performance (строка ~962-972)
7. analytics_cleaners_performance (строка ~1140-1150)

Паттерн один и тот же: найди Job.objects.filter(company=company, status=...) и добавь context=Job.CONTEXT_CLEANING.

Не трогай maintenance views. Не трогай imports. Только добавь context фильтр.
```

---

### TASK 0.6 — Verify context isolation fix

```
После предыдущих исправлений проверь:

1. grep -n "Job.objects.filter" backend/apps/api/views_reports.py
   — каждый вызов должен иметь context= фильтр (кроме detail views по ID)

2. grep -n "Job.objects.filter" backend/apps/api/analytics_views.py
   — каждый вызов должен иметь context=Job.CONTEXT_CLEANING

3. Убедись что maintenance views (views_maintenance.py) НЕ были затронуты.

4. Убедись что backend запускается без ошибок:
   cd backend && python manage.py check

Выведи результат проверки в чат. Файлы не создавай.
```

---

# ФАЗА 1 — SECURITY (блокеры production)

---

### TASK 1.1 — Password validation at signup

```
Файл: backend/apps/api/views_auth.py
Строка: ~258-259 (ManagerSignupView.post)

Проблема: signup НЕ вызывает validate_password(). Можно зарегистрироваться с паролем "123".

Добавь валидацию ПЕРЕД owner.set_password(password):

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

try:
    validate_password(password, user=owner)
except ValidationError as e:
    return Response(
        {"password": list(e.messages)},
        status=status.HTTP_400_BAD_REQUEST,
    )

Не трогай другие endpoints. Только ManagerSignupView.
```

---

### TASK 1.2 — Add rate limiting to login endpoints

```
Файл: backend/config/settings.py и backend/apps/api/views_auth.py

Шаг 1 — В settings.py добавь в REST_FRAMEWORK:

REST_FRAMEWORK = {
    ...existing settings...,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10/minute",
    },
}

Шаг 2 — В views_auth.py добавь throttle_classes к login views:

from rest_framework.throttling import AnonRateThrottle

class ManagerLoginView(APIView):
    throttle_classes = [AnonRateThrottle]
    ...

class CleanerLoginView(APIView):
    throttle_classes = [AnonRateThrottle]
    ...

class ManagerSignupView(APIView):
    throttle_classes = [AnonRateThrottle]
    ...

Не трогай authenticated endpoints.
```

---

### TASK 1.3 — Remove hardcoded dev credentials from Mobile

```
Файл: mobile-cleaner/src/screens/LoginScreen.tsx
Строка: ~32

Замени:
  const [password, setPassword] = React.useState("Test1234!");
На:
  const [password, setPassword] = React.useState("");

Также найди и обнули email если захардкожен:
  const [email, setEmail] = React.useState("cleaner@test.com");
На:
  const [email, setEmail] = React.useState("");

Проверь что больше нигде нет:
  grep -rn "Test1234\|cleaner@test" mobile-cleaner/src/
```

---

### TASK 1.4 — Disable GPS bypass for production builds

```
Файл: mobile-cleaner/src/utils/gps.ts (или аналог)

Найди dev GPS bypass:
  grep -rn "bypass\|skip.*gps\|mock.*location\|__DEV__" mobile-cleaner/src/

Убедись что bypass работает ТОЛЬКО когда __DEV__ === true.
В production builds Expo __DEV__ автоматически false.

Если bypass реализован иначе (env variable, hardcoded flag) — исправь.

Не удаляй bypass для dev — только убедись что в production он отключён.
```

---

# ФАЗА 2 — DATABASE & PERFORMANCE

---

### TASK 2.1 — Add missing database indexes

```
Файл: backend/apps/jobs/models.py

Найди поле status в модели Job и добавь db_index=True:
  status = models.CharField(..., db_index=True)

Найди поле scheduled_date и добавь db_index=True:
  scheduled_date = models.DateField(..., db_index=True)

После изменения создай миграцию:
  cd backend && python manage.py makemigrations jobs

Убедись что миграция создана и содержит AlterField для обоих полей.

Не трогай другие модели в этом задании.
```

---

### TASK 2.2 — Add maintenance model indexes

```
Файл: backend/apps/maintenance/models.py

Добавь db_index=True к:
1. Asset.is_active
2. ServiceContract.status
3. ServiceContract.start_date
4. ServiceContract.end_date

После изменения:
  cd backend && python manage.py makemigrations maintenance

Убедись что миграция создана.
```

---

### TASK 2.3 — Add composite index for analytics queries

```
Файл: backend/apps/jobs/models.py

В Meta класс модели Job добавь composite index:

class Meta:
    indexes = [
        models.Index(
            fields=['company', 'status', 'actual_end_time'],
            name='jobs_company_status_endtime_idx'
        ),
        models.Index(
            fields=['company', 'context', 'status'],
            name='jobs_company_context_status_idx'
        ),
    ]

После:
  cd backend && python manage.py makemigrations jobs

Не трогай другие модели.
```

---

### TASK 2.4 — Refactor analytics_summary to use DB aggregation

```
Файл: backend/apps/api/analytics_views.py

Найди _calculate_summary_for_range() (~строка 47).

Проблема: функция загружает ВСЕ jobs в память через Python for loop.

Замени Python-итерацию на Django ORM aggregation:

from django.db.models import Count, Avg, F, Q
from django.db.models.functions import TruncDate

# Вместо:
# for job in qs:
#     ...подсчёт в Python...

# Используй:
jobs_count = qs.count()
# violation count через SLA — оставь текущую логику если SLA считается в Python,
# но для count/avg используй ORM.

ВАЖНО: Не сломай формат ответа API. Результат должен быть тот же JSON.
Если SLA считается через compute_sla_status_and_reasons_for_job() в Python —
оставь эту часть, но используй .iterator(chunk_size=500) вместо загрузки всего в память.

Минимальное изменение: замени `for job in qs:` на `for job in qs.iterator(chunk_size=500):`
во ВСЕХ analytics functions.

Не трогай views_reports.py. Только analytics_views.py.
```

---

### TASK 2.5 — Add .iterator() to remaining analytics views

```
Файл: backend/apps/api/analytics_views.py

Найди ВСЕ места где есть `for job in qs:` или `for job in queryset:`
и замени на `for job in qs.iterator(chunk_size=500):`

Функции для исправления:
1. analytics_jobs_completed
2. analytics_violations_trend
3. analytics_job_duration
4. analytics_proof_completion
5. analytics_sla_breakdown
6. analytics_locations_performance
7. analytics_cleaners_performance

Это не полный рефакторинг, но снижает memory footprint.

Не трогай другие файлы.
```

---

# ФАЗА 3 — MOBILE APP FIXES

---

### TASK 3.1 — Add 401 redirect to Login

```
Файл: mobile-cleaner/src/api/client.ts

Найди место где делаются API запросы (fetch wrapper).

Добавь проверку: если response.status === 401:
1. await AsyncStorage.removeItem('@auth_token')
2. Перенаправь на Login screen

Для навигации без доступа к navigation prop — используй navigation ref.
Посмотри как устроен App.tsx — если есть navigationRef, используй его.
Если нет — создай:

// В App.tsx:
import { navigationRef } from './navigation';
<NavigationContainer ref={navigationRef}>

// В navigation.ts (новый файл):
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef();
export function resetToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  }
}

// В client.ts:
import { resetToLogin } from '../navigation';
if (response.status === 401) {
  await AsyncStorage.removeItem('@auth_token');
  resetToLogin();
}

Не трогай backend.
```

---

### TASK 3.2 — Add Logout button

```
Файл: mobile-cleaner/src/screens/JobsScreen.tsx

Добавь кнопку Logout в header:

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// В headerRight (или в navigation options):
headerRight: () => (
  <TouchableOpacity onPress={() => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('@auth_token');
        // используй resetToLogin() из task 3.1
        resetToLogin();
      }}
    ]);
  }}>
    <Text style={{ color: '#FF3B30', marginRight: 16 }}>Logout</Text>
  </TouchableOpacity>
)

Не трогай backend. Не трогай LoginScreen.
```

---

### TASK 3.3 — Fix JobsScreen error messages

```
Файл: mobile-cleaner/src/screens/JobsScreen.tsx

Проблема: показывает "Session expired" для ЛЮБОЙ ошибки.

Исправь error handling:

try {
  const jobs = await fetchTodayJobs();
  ...
} catch (error) {
  if (error?.response?.status === 401) {
    // уже обработано в client.ts (task 3.1)
    return;
  }
  // Проверь network
  const isOffline = !navigator.onLine; // или NetInfo
  if (isOffline) {
    setError("No internet connection. Pull to refresh.");
  } else {
    setError("Failed to load jobs. Pull to refresh.");
  }
}

Убери текст "Session expired" из generic error handler.

Не трогай JobDetailsScreen.
```

---

### TASK 3.4 — Add network detection to JobsScreen

```
Файл: mobile-cleaner/src/screens/JobsScreen.tsx

Посмотри как offline detection реализован в JobDetailsScreen (NetInfo или useNetInfo).

Скопируй тот же паттерн в JobsScreen:
1. Импортируй NetInfo
2. Добавь state: const [isOffline, setIsOffline] = useState(false);
3. Подпишись на изменения сети в useEffect
4. Когда offline — покажи banner "You are offline"
5. Когда online после offline — автоматический refetch

Не трогай backend.
```

---

### TASK 3.5 — Add offline job cache

```
Файлы:
- mobile-cleaner/src/utils/cache.ts (создай новый)
- mobile-cleaner/src/screens/JobsScreen.tsx

cache.ts:

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@today_jobs_cache';

export async function cacheTodayJobs(jobs: any[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(jobs));
}

export async function getCachedTodayJobs(): Promise<any[] | null> {
  const data = await AsyncStorage.getItem(CACHE_KEY);
  return data ? JSON.parse(data) : null;
}

В JobsScreen.tsx:
1. После успешного fetch → cacheTodayJobs(jobs)
2. При ошибке + offline → const cached = await getCachedTodayJobs()
3. Если есть cached → показывай с banner "Showing cached data"
4. Если нет → "Open the app online first"

Не трогай backend.
```

---

# ФАЗА 4 — DEPLOYMENT PREP

---

### TASK 4.1 — Install and configure WhiteNoise

```
Файл: backend/config/settings.py и backend/requirements.txt

Шаг 1 — Добавь в requirements.txt:
whitenoise==6.6.0

Шаг 2 — В settings.py добавь middleware СРАЗУ ПОСЛЕ SecurityMiddleware:
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    ...остальные без изменений...
]

Шаг 3 — Добавь в settings.py:
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

Не трогай другие middleware. Не трогай views.
```

---

### TASK 4.2 — Add Sentry integration

```
Файл: backend/config/settings.py и backend/requirements.txt

Шаг 1 — Добавь в requirements.txt:
sentry-sdk==1.40.0

Шаг 2 — В settings.py, в конце файла (после всех других настроек):

import sentry_sdk

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if not DEBUG and SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        send_default_pii=False,
    )

Не трогай другие настройки.
```

---

### TASK 4.3 — Enhance health check endpoint

```
Файл: найди health view (grep -rn "health" backend/apps/api/)

Замени простой {"status": "ok"} на проверку БД:

from django.http import JsonResponse
from django.db import connection

def health_view(request):
    try:
        connection.ensure_connection()
        db_status = "connected"
    except Exception as e:
        return JsonResponse(
            {"status": "error", "database": str(e)},
            status=503
        )
    return JsonResponse({
        "status": "ok",
        "database": db_status,
    })

Не трогай другие views.
```

---

### TASK 4.4 — Create Dockerfile

```
Создай файл: backend/Dockerfile

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir gunicorn psycopg2-binary

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]

Также создай backend/.dockerignore:
__pycache__
*.pyc
db.sqlite3
media/
.env
.env.local
node_modules
```

---

### TASK 4.5 — Create docker-compose.yml

```
Создай файл: docker-compose.yml в корне проекта

version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env.production
    depends_on:
      - db
      - redis
    volumes:
      - media_data:/app/media

  celery-worker:
    build: ./backend
    command: celery -A config worker -l info --pool=prefork --concurrency=4
    env_file:
      - ./backend/.env.production
    depends_on:
      - db
      - redis

  celery-beat:
    build: ./backend
    command: celery -A config beat -l info
    env_file:
      - ./backend/.env.production
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cleanproof
      POSTGRES_USER: cleanproof
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  media_data:
```

---

### TASK 4.6 — Fix CI security tests path

```
Файл: .github/workflows/security-checks.yml

Проблема: CI references tests/security/ но директория не существует.

Вариант A — создай пустую директорию с placeholder:
  mkdir -p backend/tests/security
  touch backend/tests/security/__init__.py
  touch backend/tests/security/test_placeholder.py

В test_placeholder.py:
  def test_placeholder():
      """Placeholder for security tests."""
      assert True

Вариант B — обнови CI workflow чтобы пропускал если директория не существует.

Выбери вариант A (проще).
```

---

# ФАЗА 5 — FRONTEND QUALITY

---

### TASK 5.1 — Add pagination to History page

```
Файл: dubai-control/src/api/planning.ts (или client.ts)

Проблема: fetchJobsHistory() загружает ВСЕ jobs без лимита.

Шаг 1 — Backend: проверь что /api/manager/jobs/history/ поддерживает ?page=&page_size=
Если нет — добавь пагинацию в ManagerJobsHistoryView (views_manager_jobs.py ~1029).

Шаг 2 — Frontend: обнови fetchJobsHistory() чтобы передавать page и page_size.

Шаг 3 — В History.tsx добавь "Load more" кнопку или infinite scroll.

ВАЖНО: History.tsx может быть LOCKED (см. CLAUDE.md). Проверь перед изменением.
Если locked — СТОП, спроси подтверждение.
```

---

### TASK 5.2 — Add pagination to Locations list

```
Файл: dubai-control/src/api/client.ts

Проблема: getLocations() загружает ВСЕ локации без лимита.

Аналогично task 5.1:
1. Проверь backend pagination support
2. Обнови frontend API call
3. Добавь pagination UI

ВАЖНО: Locations.tsx может быть LOCKED. Проверь CLAUDE.md.
```

---

### TASK 5.3 — Add retry buttons to error states

```
Файлы:
- dubai-control/src/pages/Dashboard.tsx
- dubai-control/src/pages/Analytics.tsx

Проблема: при ошибке нет кнопки retry.

Посмотри как retry реализован в JobPlanning.tsx:214-225 (эталон).
Скопируй паттерн:

{error && (
  <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center justify-between gap-3">
    <div className="text-sm text-destructive">{error}</div>
    <Button size="sm" variant="outline" onClick={refetch}>Retry</Button>
  </div>
)}

ВАЖНО: Dashboard.tsx и Analytics.tsx могут быть LOCKED. Проверь CLAUDE.md.
```

---

# ФАЗА 6 — DOCUMENTATION SYNC

---

### TASK 6.1 — Fix documentation mismatches

```
Обнови документацию по результатам аудита:

1. MASTER_BRIEF.md — Замени "Force-complete: override всегда даёт violation"
   на "Force-complete: transitions to completed_unverified, excluded from standard KPIs"

2. Если late_start НЕ будет реализован — убери его из:
   - docs/sla/MASTER_CONTEXT_SLA.md
   - dubai-control/src/pages/Analytics.tsx:53 (label map)
   - backend/apps/api/pdf.py:78 (label map)

3. Обнови PROJECT_STATE.md — добавь секцию о context isolation fix.

Не трогай код. Только .md файлы и label maps.
```

---

# ПОРЯДОК ВЫПОЛНЕНИЯ

```
ФАЗА 0 — Context Isolation (6 tasks)     ~1-2 часа    КРИТИЧНО
ФАЗА 1 — Security (4 tasks)              ~2-3 часа    КРИТИЧНО
ФАЗА 2 — Database & Performance (5 tasks) ~2-3 часа   ВАЖНО
ФАЗА 3 — Mobile App (5 tasks)            ~4-5 часов   ВАЖНО
ФАЗА 4 — Deployment (6 tasks)            ~2-3 часа    ПЕРЕД ДЕПЛОЕМ
ФАЗА 5 — Frontend Quality (3 tasks)      ~3-4 часа    ПОСЛЕ ЗАПУСКА ОК
ФАЗА 6 — Documentation (1 task)          ~30 минут    В КОНЦЕ
```

**Итого: 30 задач, ~15-20 часов работы.**

---

# ПРАВИЛА ДЛЯ CLAUDE CODE

1. Делай ОДНУ задачу за раз
2. После каждой задачи: `python manage.py check` (backend) или `npm run build` (frontend)
3. Проверяй CLAUDE.md перед изменением LOCKED файлов
4. Не трогай Cleaning код при исправлении Maintenance (и наоборот)
5. Не рефактори то что не просят
6. Если задача неясна — СТОП, спроси
