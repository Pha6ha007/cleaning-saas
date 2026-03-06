# AUDIT_DATA_INTEGRITY — Корректность вычислений

**Дата:** 2026-03-05
**Источник:** Точечный аудит Claude Code (промпт 2)

---

## 1. SLA Engine — Логика

**Функция:** `compute_sla_status_and_reasons_for_job()` — `backend/apps/api/views_reports.py:160-227`

### Conditions для sla_status=violated:

| Condition | Строки | Результат |
|-----------|--------|-----------|
| `job.sla_reasons` не пустой (explicit override) | 172-185 | violated + normalized reasons |
| Нет before photo (TYPE_BEFORE) | 188-196, 218 | reason: `missing_before_photo` |
| Нет after photo (TYPE_AFTER) | 188-196, 219 | reason: `missing_after_photo` |
| Checklist required items не completed | 199-213, 220 | reason: `checklist_not_completed` |
| Хотя бы 1 reason | 224-227 | sla_status = `violated` |

**Работает только для status=completed.** Для других статусов SLA не вычисляется.

### ❌ ПРОБЛЕМА: Force-complete НЕ даёт автоматический violation

Функция `compute_sla_status_and_reasons_for_job()` **полностью игнорирует** поля force-complete:
- `verification_override` — не проверяется
- `force_completed_at` — не проверяется
- `force_completed_by` — не проверяется
- `force_complete_reason` — не проверяется

Документация (MASTER_BRIEF.md) заявляет: *"Force-complete: override всегда даёт violation, transitions to completed_unverified"*. Но в коде SLA-функция не проверяет эти поля.

**Однако:** Force-complete устанавливает status=`completed_unverified`, а SLA считается только для `completed`. Это означает что force-completed jobs **вообще не попадают в SLA-расчёт** — они исключены по статусу, а не помечены как violation. Документация говорит "violation", код говорит "excluded". Результат для KPI одинаковый (не считаются как ok), но семантика разная.

**Verdict:** ⚠️ Расхождение с документацией, но не баг — данные не искажаются.

### ❌ ПРОБЛЕМА: late_start НЕ реализован

В документации и frontend (Analytics.tsx:53, pdf.py:78) `late_start` упоминается как SLA reason. В `ManagerViolationJobsView` (строки 484-490) `missing_check_in` и `missing_check_out` перечислены.

Но `compute_sla_status_and_reasons_for_job()` **не проверяет** late_start. Нет сравнения `scheduled_time` с `actual_start_time`. Нет threshold.

**Verdict:** ⚠️ Заявленная причина SLA-нарушения не реализована в вычислительном ядре.

### ✅ Checklist логика — корректна

- Если есть required items → проверяются только required (строки 199-207)
- Если нет required items → ВСЕ items считаются обязательными (строка 208)
- Если чеклиста вообще нет → checklist_completed = True (строка 210)
- 0/6 completed при required items → violation ✅

### ✅ Photos логика — корректна

- Проверяет наличие хотя бы одного before + одного after фото
- Нет before → `missing_before_photo`
- Нет after → `missing_after_photo`

---

## 2. Analytics — Фильтрация

**Файл:** `backend/apps/api/analytics_views.py`

### completed_unverified — ИСКЛЮЧЕНЫ из KPI ✅

Все endpoints фильтруют `status=Job.STATUS_COMPLETED`:
- Строка 50, 308, 397, 503, 607, 769, 965, 1143

`completed_unverified` jobs **не попадают** ни в один KPI. Это правильно и соответствует документации.

### cancelled jobs — ИСКЛЮЧЕНЫ ✅

Нет фильтра включающего `STATUS_CANCELLED`. Cancelled jobs полностью исключены.

### Фильтрация по date — actual_end_time ✅

Analytics использует `actual_end_time` для фильтрации (строки 52-53). Это правильный подход — job считается в периоде когда он реально завершён.

### ⚠️ РАСХОЖДЕНИЕ: Performance vs Analytics используют РАЗНЫЕ даты

| Endpoint | Файл | Фильтр по дате | Строки |
|----------|-------|----------------|--------|
| Analytics (все) | analytics_views.py | `actual_end_time` | 52-53 |
| _get_company_report() | views_reports.py | `actual_end_time` | — |
| **ManagerPerformanceView** | views_reports.py | **`scheduled_date`** | **331-332** |
| **ManagerViolationJobsView** | views_reports.py | **`scheduled_date`** | **557-558** |

**Проблема:** Один и тот же job может попасть в разные периоды в зависимости от endpoint:
- Analytics покажет job в марте (actual_end_time = март)
- Performance покажет тот же job в феврале (scheduled_date = февраль)

**Verdict:** ⚠️ Расхождение в логике фильтрации. Менеджер может видеть разные цифры на разных страницах.

---

## 3. Reports vs Analytics — Consistency

### ✅ Одна SLA-функция

И Reports и Analytics вызывают `compute_sla_status_and_reasons_for_job()` для расчёта SLA. SQL queries разные, но SLA-ядро общее.

### ✅ Оба фильтруют по completed only

`_get_company_report()` и `analytics_summary()` — оба работают только с `STATUS_COMPLETED`.

### ⚠️ Но разные date-фильтры (см. выше)

`_get_company_report()` использует `actual_end_time`, а `ManagerPerformanceView` — `scheduled_date`. Это может давать **разные цифры на разных страницах портала**.

---

## 4. Edge Cases

### ✅ Деление на ноль — ЗАЩИЩЕНО

| Место | Защита | Строки |
|-------|--------|--------|
| `_get_company_report()` violation rate | `if jobs_count else 0.0` | views_reports.py:112 |
| analytics summary | `if jobs_completed` check | analytics_views.py:133-136 |
| `_percent_delta()` | `if previous is None or previous == 0` | analytics_views.py:34-37 |

0 completed jobs → violation_rate = 0.0, не crash. ✅

### ⚠️ Job в разных периодах

Job создан 28 февраля, завершён 3 марта:
- Analytics (actual_end_time) → попадёт в **март** ✅
- Performance (scheduled_date) → попадёт в **февраль** ⚠️
- Weekly/Monthly reports → попадёт в **март** (actual_end_time) ✅

Менеджер может заметить расхождение между Performance и Analytics/Reports.

### ✅ Деактивированный cleaner

`Job.cleaner` = ForeignKey с `on_delete=PROTECT` → удаление cleaner с jobs невозможно.

Деактивированный cleaner (`is_active=False`):
- Его **исторические jobs остаются** в аналитике ✅ (правильно для исторических данных)
- Новые jobs ему **назначить нельзя** (enforcement на создании)
- Но нет фильтра "показать только active cleaners" в analytics breakdown

**Verdict:** ✅ Данные не теряются, исторические записи сохраняются.

---

## 5. Сводка находок

### Критичные (❌ нужно исправить)

| # | Проблема | Impact | Где |
|---|---------|--------|-----|
| — | Критичных багов вычислений не найдено | — | — |

### Важные (⚠️ нужно решить)

| # | Проблема | Impact | Где |
|---|---------|--------|-----|
| 1 | Performance/ViolationJobs фильтрует по `scheduled_date`, остальные по `actual_end_time` | Разные цифры на разных страницах | views_reports.py:331-332, 557-558 |
| 2 | `late_start` заявлен в документации, не реализован в SLA engine | SLA-причина не отслеживается | views_reports.py:160-227 |
| 3 | Force-complete документирован как "всегда violation", реально — "excluded from KPI" | Семантическое расхождение с документацией | MASTER_BRIEF.md vs views_reports.py |

### ОК (✅ работает корректно)

| # | Проверка | Результат |
|---|---------|-----------|
| 1 | completed_unverified исключены из KPI | ✅ Правильно |
| 2 | cancelled jobs исключены | ✅ Правильно |
| 3 | Reports и Analytics используют одну SLA-функцию | ✅ Консистентно |
| 4 | Деление на ноль защищено | ✅ Везде |
| 5 | Checklist validation logic | ✅ Корректна |
| 6 | Photos validation logic | ✅ Корректна |
| 7 | Исторические данные деактивированных cleaners | ✅ Сохраняются |
| 8 | Job.cleaner PROTECT от удаления | ✅ Целостность данных |

---

## 6. Рекомендации

1. **Унифицировать date-фильтрацию** — перевести ManagerPerformanceView и ManagerViolationJobsView на `actual_end_time` (как в Analytics и Reports)
2. **Реализовать late_start** в SLA engine — или убрать из документации и frontend labels
3. **Уточнить документацию** по force-complete: "excluded from standard KPI" вместо "always violation"
