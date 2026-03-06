# AUDIT_FRONTEND_QUALITY — UX/Quality Manager Portal

**Дата:** 2026-03-05
**Общая оценка:** 7.5/10 — Production-ready, но нужны pagination, TypeScript strictness и retry.

---

## 1. Error Handling (5 ключевых страниц)

### Dashboard.tsx

| Aspect | Status | Detail |
|--------|--------|--------|
| Loading state | ✅ | "Loading jobs..." :378 |
| Error state | ✅ | Показывает error text :357-360 |
| Empty state | ✅ | "No jobs for today." :381-383 |
| Retry | ❌ | Нет кнопки retry, только перезагрузка страницы |
| Company blocked | ✅ | Обрабатывает gracefully :186-191, 280-293 |

### JobPlanning.tsx

| Aspect | Status | Detail |
|--------|--------|--------|
| Loading state | ✅ | Skeleton + "Loading..." :210 |
| Error state | ✅ | Error + retry button :214-225 |
| Empty state | ⚠️ | Таблица с 0 jobs, но нет dedicated empty message |
| Retry | ✅ | Кнопка retry :220-223 |
| Trial expired | ✅ | TrialExpiredBanner :191-198 |

**Лучшая реализация в портале** — error + retry + trial banner.

### Analytics.tsx

| Aspect | Status | Detail |
|--------|--------|--------|
| Loading state | ✅ | Opacity change :577-580 |
| Error state | ✅ | Error text :572-576 |
| Empty state | ✅ | Dedicated banners :563-568, 597-601, 905-909 |
| Retry | ❌ | Нет retry, только смена date range |

Отличный empty state: *"No completed jobs in the selected period yet. Analytics will appear here once cleaners finish at least one job."*

### Reports.tsx

| Aspect | Status | Detail |
|--------|--------|--------|
| Loading state | ✅ | "Loading..." :541-542, 705-707 |
| Error state | ✅ | Error messages :545-549, 708-712 |
| Empty state | ✅ | "No data" :609-612, 647-652, 797-800 |
| Retry | ❌ | Нет explicit retry, React Query refetch |
| Email feedback | ✅ | Success/error messages :400-406 |

### Locations.tsx (LocationsNew.tsx)

| Aspect | Status | Detail |
|--------|--------|--------|
| Loading state | ✅ | Spinner :169-175 |
| Error state | ⚠️ | Только toast, нет inline error |
| Empty state | ✅ | Comprehensive empty state :241-260 |
| Retry | ⚠️ | Только toast, нет retry button |

---

## 2. Forms Validation

### CreateJobDrawer.tsx — ✅ ОТЛИЧНАЯ валидация

| Поле | Валидация | Строки |
|------|-----------|--------|
| Date | ✅ Required | :235-238 |
| Location | ✅ Required + Active check | :235-238, 296-309 |
| Cleaner | ✅ Required | :235-238 |
| Start Time | ✅ Format + Logic | :241-254 |
| End Time | ✅ Format + Logic (> start) | :241-254 |
| Checklist | ✅ Optional | :270-272 |

Дополнительно обрабатывает: trial_expired, company_blocked, location_inactive, generic errors.

### LocationForm — не проаудирован детально (существует, нужна отдельная проверка координат).

### Create Cleaner Form — не найден в аудите (вероятно в Settings или Company).

---

## 3. Pagination — ❌ КРИТИЧНАЯ ПРОБЛЕМА

| Page | Pagination | Severity | Detail |
|------|-----------|----------|--------|
| Dashboard (today jobs) | ❌ НЕТ | Medium | Обычно <50, но нет лимита |
| JobPlanning | ❌ НЕТ | High | Все jobs за дату, нет лимита |
| **History** | **❌ НЕТ** | **Critical** | **Может загрузить 1000+ jobs** |
| **Locations** | **❌ НЕТ** | **High** | **Все локации разом, нет лимита** |
| Analytics | ❌ НЕТ | — | Агрегированные данные, не список |
| Reports | ❌ НЕТ | — | Summary данные |
| ViolationJobs | ✅ ДА | — | page, page_size :1588-1622 |
| EmailLogs | ✅ ДА | — | 50 per page :1694-1775 |

**Главный риск:** History и Locations без пагинации → browser freeze при 500+ записях.

---

## 4. TypeScript Issues

### Статистика

| Паттерн | Кол-во | Severity |
|---------|--------|----------|
| `error: any` | 15 | Medium |
| `: any` в типах | 12 | High |
| `as any` | 6 | Critical |
| `@ts-ignore` | 2 | Critical |
| `(window as any)` | 2 | Low (допустимо) |

### Критичные проблемы

| Файл | Проблема | Severity |
|------|---------|----------|
| api/client.ts:409 | `normalizeJob(raw: any)` — 76 строк манипуляций с `any` | Critical |
| api/client.ts:486 | `normalizeChecklist(raw: any)` | High |
| api/client.ts:515 | `buildJobTimeline(raw: any)` | High |
| api/client.ts:601 | `normalizePhotos(raw: any)` | High |
| api/client.ts:32 | `[key: string]: any` в ManagerJobSummary | High |
| api/client.ts:183 | `[key: string]: any` в Location | High |
| planning/CreateJobDrawer.tsx:64 | `(loc as any).is_active` | Medium |

**Core normalization functions (`normalizeJob`, `normalizeChecklist`, `buildJobTimeline`, `normalizePhotos`) — все на `any`.** Это ядро data layer без типизации.

---

## 5. API Error Handling

### API Client (client.ts)

| Aspect | Status | Detail |
|--------|--------|--------|
| Network errors | ✅ | try/catch в apiFetch :260-306 |
| HTTP status codes | ✅ | Проверка resp.ok :280 |
| Error parsing | ✅ | JSON fallback :282-288 |
| Error structure | ✅ | Consistent error.response.data :292-298 |
| Retry logic | ❌ | Нет retry механизма |
| Timeout handling | ❌ | Нет explicit timeout |

### Planning API (planning.ts) — ✅ ОТЛИЧНАЯ обработка

- Trial expired → custom error с кодом `trial_expired` :194-218
- Company blocked → separate handling :199-207
- Forbidden (403) → handled separately :199-214
- Generic errors → re-thrown :217

---

## 6. Сводка критичных проблем

| # | Проблема | Severity | Файл |
|---|---------|----------|------|
| 1 | **Нет pagination для History** — 1000+ jobs за раз | Critical | planning.ts:232-258 |
| 2 | **Core functions на `any`** — normalizeJob и 3 другие | Critical | client.ts:409,486,515,601 |
| 3 | **Нет pagination для Locations** | High | client.ts:1163-1166 |
| 4 | Нет retry на Analytics error | Medium | Analytics.tsx:572-576 |
| 5 | Locations — только toast, нет inline error | Medium | LocationsNew.tsx:61-69 |
| 6 | Index signatures `[key: string]: any` | High | client.ts:32,183 |
| 7 | Нет retry в API client | Medium | client.ts:260-306 |
| 8 | Нет timeout handling | Medium | client.ts:260-306 |

---

## 7. Рекомендации по приоритету

### 🔴 Critical (делать первым)

1. **Pagination для History** — может заморозить браузер при 1000+ jobs
2. **Типизировать normalizeJob() и связанные** — core data transformation без типов
3. **Pagination для Locations** — масштабируемость

### 🟠 High

4. Retry buttons на Analytics и Dashboard errors
5. Inline error display для Locations (не только toast)
6. Заменить `[key: string]: any` на proper types

### 🟡 Medium

7. Retry logic в API client (exponential backoff)
8. Timeout handling (30s для API calls)
9. Pagination для Today's Jobs (future-proofing)

### 🟢 Low

10. Fix `@ts-ignore` в indeterminate checkbox
11. Заменить `error: any` на typed error handling
12. Dedicated empty states там где implicit

---

## Сильные стороны портала

- ✅ Отличная обработка trial/company_blocked сценариев
- ✅ Хорошие loading/empty states на большинстве страниц
- ✅ Сильная frontend валидация форм (CreateJobDrawer)
- ✅ Consistent error structure в API layer
- ✅ JobPlanning — эталонная реализация error + retry
