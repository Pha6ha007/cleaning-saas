# DEV_BRIEF.md — Cleaning SaaS
(Frontend / Mobile / Backend integration guide)

Status: ACTIVE  
Last reviewed: 2026-02-04

---
### Правило ведения

- DEV_BRIEF.md — живой документ.
- Все изменения в правилах, инвариантах и поведении фиксируются в CHANGELOG.
- Новые записи добавляются сверху.
- CHANGELOG отражает изменения документации, а не кода или API.

## CHANGELOG

### Правило ведения

- Changelog ведётся **только для DEV_BRIEF.md**.
- Новые записи **всегда добавляются сверху**.
- Версия относится к **документации**, а не к API или продукту.
- Записи добавляются **только если изменилось поведение, правила или инварианты**.
- Косметические правки и переформулировки без изменения смысла — **не логируются**.

### Формат записи

```md
### X.Y.Z — YYYY-MM-DD
- NEW: краткое описание нового поведения / правила / флоу.
- CHANGED: что изменилось в существующем поведении или договорённостях.
- FIXED: уточнения, снятие противоречий, прояснение семантики.
- DEPRECATED: (опционально) что объявлено устаревшим, но ещё поддерживается.
- BREAKING: (опционально, ВСЕГДА ЯВНО) ломающие изменения в правилах.

### 1.4.0 — 2026-02-04
- NEW: Force-complete flow for managers with SLA violation enforcement.
- NEW: Reports v2 email delivery with audit log (job / weekly / monthly).
- CHANGED: Analytics now uses live data instead of mocks.
- FIXED: Clarified SLA engine as single source of truth for reports and analytics.

### 0.1.0 — 2026-02-04
- NEW: Добавлен CSV export завершённых jobs для audit и owner/manager использования.
  - Endpoint: `GET /api/manager/jobs/export/`
  - Экспортируются только `completed` jobs в заданном диапазоне дат (`from` / `to`).
  - Source of truth по времени — `actual_end_time`, а не `scheduled_date`.
  - В экспорт включены: job, location, cleaner, duration, SLA status, SLA reasons, force-complete флаг.
  - Экспорт read-only, не влияет на execution, SLA или reports.
- FIXED: Зафиксирована семантика audit-export как Layer 5 feature без UI и без бизнес-логики на фронте.

### 1.0.0 — 2026-02-04
- NEW: На экране Job History добавлена кнопка **“Download CSV”**, которая дергает
  `GET /api/manager/jobs/export/` с текущим диапазоном дат и (по мере появления) фильтрами
  локации/клинера/SLA-статуса. Экспорт используется как аудиторский выгрузочный инструмент.
- CHANGED: Диапазон дат в Job History теперь является единственным источником правды
  и для выборки списка (`/api/manager/jobs/history/`), и для CSV-экспорта — отдельные поля
  под экспорт не вводятся.
- FIXED: Уточнены ожидания по UX Data Export:
  кнопка недоступна без выбранного периода, пустой период обязан возвращать пустой CSV
  (только заголовок), ошибки сервера/сети отображаются в виде toast, не ломая страницу.

### X.Y.Z — 2026-02-04
- NEW: Locations deletion is blocked when referenced by jobs (database-level PROTECT).
- NEW: Operational rule established — locations are deactivated via `is_active` instead of deletion.
- FIXED: Guaranteed referential integrity for `Job.location` across job history.

### 1.6.0 — 2026-02-05
- NEW: В разделе Locations добавлен Google Maps с draggable-маркером для точной установки координат.
- NEW: Добавлен адресный поиск через Google Places Autocomplete с автоматическим заполнением координат.
- CHANGED: Процесс задания координат локации — теперь через Google Maps вместо Leaflet.
- FIXED: Устранена неоднозначность источника координат (autocomplete + карта работают как единый флоу).
- DEPRECATED: Leaflet / OpenStreetMap больше не используются для выбора координат локаций.

### 0.6.1 — 2026-02-05
- NEW: enforced Google Maps & Places API usage constraints for development environment.
- CHANGED: Google Maps API key is now restricted by HTTP referrer (`http://localhost:8080/*`).
- CHANGED: allowed Google APIs explicitly limited to Maps JavaScript API and Places API.
- FIXED: added hard monthly billing limit ($10) with alert thresholds at 50%, 90%, and 100%.

### 1.6.2 — 2026-02-05
- NEW: добавлено правило rate-limiting для Google Places Autocomplete в форме Locations.
- CHANGED: address autocomplete больше не имеет права дергать Places API на каждый ввод символа — запросы делаются только после debounce и при достаточной длине строки.
- FIXED: снята неявность по расходам и нагрузке на Places API за счёт явных ограничений частоты запросов из UI.

### 1.7.0 — 2026-02-06
- NEW: Locations list now supports client-side search by name and address.
- NEW: Status filter added to Locations list (all / active / inactive).
- NEW: Sorting controls added for Locations list (name, status, created date).
- CHANGED: Locations list navigation is now optimized for operational scale instead of static viewing.
- FIXED: Clarified that Locations table ordering is no longer implicit and is always explicitly controlled by user actions (sort + filters).

### Locations — Google Maps integration rules

- Для выбора адреса используется Google Places Autocomplete.
- Карта и поиск адреса разделены на отдельные компоненты:
  - AddressAutocompleteInput — отвечает только за поиск и выбор адреса;
  - LocationMap — отвечает только за отображение карты и маркера.
- Источник правды по адресу и координатам — state формы LocationForm.
- После выбора адреса координаты передаются в карту и сохраняются в форме автоматически.
- Google Maps API и Places API загружаются только внутри LocationForm (lazy load), а не глобально.
- Используется минимальный набор API:
  - Maps JavaScript API
  - Places API
- Manual latitude / longitude input — fallback-only, не основной UX-поток.

#### Places Autocomplete — rate limiting (обязательно)

Чтобы не спамить Google Places и не сжечь бюджет:

- все запросы к Places API делаются только через debounced-вызов (300–500 мс после остановки ввода);
- если текущая строка поиска короче 3 символов — запрос к Places API не отправляется вообще;
- если пользователь вводит тот же текст, что и в предыдущем запросе — новый запрос не отправляется;
- при изменении строки поиска предыдущий незавершённый запрос к Places API должен быть отменён (cancel / ignore stale response);
- автокомплит не имеет права дергать Places API “на маунте” или в фоне — только по явному пользовательскому вводу.


## 0. Текущий статус проекта

**Backend (ядро + управление + отчёты)**  
Готов и используется продакшн-клиентами:

- auth / roles  
- jobs + status-flow  
- check-in / check-out  
- checklist (templates + job snapshot + SLA)  
- photos (before / after, EXIF, distance)  
- Job PDF  
- SLA engine (micro-SLA v1)  
- Performance layer  
- Reports v2 + Email + Email history  
- Analytics  
- commercial enforcement (`company_blocked`, `trial_expired`, trial job limits)

**Mobile Cleaner App**

Работает на реальном API:

- login  
- Today Jobs  
- Job Details  
- check-in / check-out  
- before / after photos  
- checklist с обязательными пунктами (toggle / completion)  
- таймлайн JobCheckEvent  
- просмотр Job PDF

Мобильный Layer 1 (execution-логика) считается **закрытым**; дальше — только UI-полировка.

**Manager Portal**

- Planning / Create Job  
- Job History  
- Job Details  
- Settings (Company, Cleaners, soft-limits)  
- Reports (weekly / monthly, PDF, email)  
- SLA drill-down (violations)  
- Analytics (summary + cleaners performance)  
- Email history  
- commercial read-only mode

---

## 1. Phase 11.1 — Freeze & Guards (Mobile Cleaner)

Мобильный execution-core зафиксирован.

Критические точки входа:

Login → Today Jobs → Job Details → Check-in → Photos / Checklist → Check-out → PDF

Ключевые файлы:
- `JobDetailsScreen`
- `api/client.ts`

В коде добавлены защитные комментарии над:
- `handleCheckIn`
- `handleCheckOut`
- `handleTakePhoto`
- `handleSharePdf`
- checklist-handler
- API-вызовами

### Зафиксированные правила

* не менять порядок шагов;
* не трогать формат payload’ов;
* не менять URL без ревью backend + Manager Portal + PDF.

Разрешены только косметические правки UI.  
Изменения логики в этих файлах делаются только после явного решения и полного прогона флоу.

---

## 2. GPS Handling (Mobile)

Вся работа с GPS проходит через:

`mobile-cleaner/src/utils/gps.ts`

### Режимы

**DEV**
* подставляет координаты job, чтобы обойти distance-check’и.

**PROD**
* использует реальный GPS устройства через `expo-location`.

### Запрещено

* инлайнить GPS-логику в экранах;
* обходить backend-валидацию расстояния.

Любые GPS-изменения — только в `utils/gps.ts`.

---

## 3. Phase 11.2 — Production GPS wrapper (mobile)

В `mobile-cleaner/src/utils/gps.ts` добавлен `getGpsPayload`, который:

1. Пытается получить координаты через `expo-location` (foreground permission).
2. При отказе/ошибке использует координаты job как fallback **в dev-окружении**.

`JobDetailsScreen` больше не отправляет жёстко захардкоженные координаты — вместо этого при check-in / check-out всегда вызывает `getGpsPayload`.

### app.json

* прописаны пермишены для геолокации и камеры (iOS + Android),
* подключены плагины `expo-location` и `expo-image-picker`,
* проект привязан к EAS (`extra.eas.projectId`, `owner`), что позволяет собирать dev-билды через `eas build`.

---

## 4. Phase 11.3 — Offline groundwork (architecture only)

Добавлены типы оффлайн-очереди (`src/offline/types.ts`) и защитные комментарии в `JobDetailsScreen`.

Реальная реализация оффлайн-логики (storage, retries, outbox-processing) осознанно отложена.

Текущая версия приложения:
* полностью **online-first**;
* оффлайн-модель зафиксирована только на уровне типов и договорённостей.

---

## 5. Landing Status (Frozen)

Текущая версия лендинга считается зафиксированной по структуре и смыслу.

Допустимы только:
* правки текста (копирайт, тон, микроформулировки),
* визуальная полировка (анимации, отступы, тайминги),
* замена или обновление скриншотов.

Запрещено:
* менять последовательность блоков,
* добавлять новые смысловые сущности,
* обещать функциональность, не подтверждённую backend-логикой.

---

## 6. Landing & Demo Status

Landing page и demo page считаются функционально завершёнными (v1 frozen).

Дальнейшая работа ограничена:
* корректировкой текста,
* визуальной полировкой,
* навигационными подсказками (только ссылки),
* заменой скриншотов.

**Вне scope:**
* новые демо-интеракции,
* интерактивные симуляции продукта,
* дополнительные ветки навигации,
* любые изменения, подразумевающие новый backend-behavior.

---

## 7. Landing & Demo Integration (Completed)

CleanProof landing и demo request страницы интегрированы в основное приложение как отдельный маркетинговый слой (`/cleanproof`, `/cleanproof/demo`):

* изолированы от product-layout;
* не используют auth;
* не ведут во внутренние роуты продукта.

Scope заморожен: дальше — только правки копирайта, визуала и точности контента.

---

## 8. Location input & map behavior (LEGACY, до Google Maps интеграции)

> Раздел оставлен как историческая справка. Фактические правила для Locations и Google Maps описаны в разделе
> "Locations — Google Maps integration rules" и в changelog 1.6.0+.

Форма Location **намеренно** не использует autocomplete и автогеокодинг.

* `Name` и `Address` — свободный текст **для людей**, не для логики.
* Карта — единственный источник истины по координатам.
* Менеджер **обязан** вручную поставить пин на карте, чтобы задать `latitude` и `longitude`.

Причины:
* координаты используются для навигации клинера и GPS check-in / check-out валидации;
* typed address даёт неоднозначность (особенно в UAE);
* такой дизайн заставляет осознанно выбирать точку.

Будущий enhancement (вне текущего scope):
* address autocomplete / геокодинг;
* “Find on map”;
* ручное подтверждение остаётся финальным шагом.

---

## 9. Map-first location discipline

Продукт жёстко разделяет:
* человечески читаемый адрес,
* operational-геопозицию.

Инженеры должны считать текстовый адрес **ненадёжным**.  
Любая логика “где происходит задача” опирается **только на координаты**.

---

## 10. Trial entry point (зафиксирован)

Старт trial происходит только через Pricing Page (`/cleanproof/pricing`).

* Кнопка **Start 7-day trial** ведёт на экран Login (`/`) с параметром `?trial=standard`.
* Если пользователь пришёл с `?trial=standard`, backend:
  * создаёт Company,
  * запускает 7-дневный trial-план.

`/cleanproof/demo` — отдельный сценарий, не связанный с trial и оплатой.

---

## 11. Marketing Layer Status (Frozen v1)

Маркетинговый слой CleanProof:
* структурно завершён;
* визуально унифицирован.

Дальше **нельзя**:
* добавлять новые маркетинговые страницы,
* расширять меню,
* вводить новые CTA без реальной продуктовой/бекенд-опоры.

Фокус инженерии:
* product stability,
* онбординг,
* логика trial/enforcement.

---

## 12. Trial flow (фиксировано)

Путь пользователя:

1. Pricing → кнопка **Start 7-day trial**
2. Переход на Login с параметром `?trial=standard`
3. Успешный login менеджера
4. Backend активирует trial через `/api/cleanproof/trials/start/`
5. Пользователь попадает в dashboard уже в trial-состоянии

На текущем этапе:
* trial не ограничивает действия пользователя напрямую на уровне UI;
* не блокирует создание jobs / cleaners сам по себе;
* не влияет на core business-логику;
* в UI — только информирующая индикация;
* кнопка Upgrade ведёт на `/cleanproof/pricing`.

---

## 13. Trial UX & Enforcement

Trial реализован как **UX-слой без жёсткого enforcement**:

* Backend определяет trial-статус и usage;
* технически backend **может** блокировать отдельные действия;
* по факту основная логика ограничений выражается через UI и коммерческие коды (`trial_expired`, `company_blocked`, `trial_jobs_limit_reached`);
* жёсткие блокировки, связанные с биллингом, вводятся только на backend’е.

---

## 14. Trial expired UX (зафиксировано)

После окончания trial:
* пользователь не вылетает из продукта;
* не сталкивается с неожиданными блокировками при просмотре;
* сохраняет доступ к данным и интерфейсу.

UX-принципы:
* `trial expired` ≠ ошибка;
* `trial expired` ≠ блокировка просмотра;
* никаких тревожных модалок;
* мягкая индикация;
* Upgrade — опция.

---

## 15. Trial soft-limits UX (Manager)

Soft-limits реализованы как **чистая UX-индикация**, без технических ограничений по cleaners (кроме тех, что явно включит backend).

Текущие soft-limits:
* количество cleaners;
* количество jobs (per day) — показывается менеджеру, но реальное ограничение по количеству jobs на trial реализуется на backend для Create Job.

Поведение на уровне UI:

* при приближении к лимиту — информирующий banner;
* при достижении лимита — UX не блокируется сам по себе;
* пользователь может продолжать работу до тех пор, пока backend не вернёт соответствующий код;
* предлагается Upgrade как опция.

Принцип:  
Soft-limits = объяснение ценности тарифа, а не жёсткий guard на фронте.

---

## 16. Company settings UX

На странице Settings реализованы:

* загрузка логотипа компании (client-side preview),
* управление cleaners (list + add modal),
* отображение trial soft-limits по cleaners,
* отсутствие фронтовых блокировок при превышении soft-limits.

Загрузка логотипа пока работает в preview-режиме и далее связывается с backend.

---

## 17. Settings (Company & Cleaners) — v1

Экран Settings состоит из трёх логических блоков:

### 17.1 Company profile

- Использует `GET /api/manager/company/` для начальной загрузки.
- Изменения сохраняются через `PATCH /api/manager/company/`.
- Логотип загружается отдельным multipart-запросом  
  `POST /api/manager/company/logo/`,  
  ответ содержит только `logo_url`, который фронт сразу подставляет в превью.

### 17.2 Team / Cleaners

- Список клинеров: `GET /api/manager/cleaners/`.
- Добавление клинера: `POST /api/manager/cleaners/`.
- Редактирование (имя, контакты, активность):  
  `PATCH /api/manager/cleaners/<id>/`.
- `is_active` используется вместо удаления; удаления клинеров из системы не предусмотрено.

### 17.3 Trial soft-limits

- Показывают только usage-информацию (кол-во клинеров vs soft-limit).
- Не блокируют создание и редактирование клинеров на фронте.
- При подходе к лимиту и при достижении лимита показывается мягкий баннер  
  с ссылкой на `/cleanproof/pricing`.

---

## 18. Что уже реализовано / Manager dashboard

Для менеджерского кабинета реализован полный цикл работы с компанией и клинерами.

Backend:

* эндпоинты `/api/manager/company/` (GET/PATCH),
* `/api/manager/company/logo/` (POST),
* `/api/manager/cleaners/` (GET/POST/PATCH).

Frontend:

* в `dubai-control/src/api/client.ts` есть обёртки для этих методов;
* страница Settings загружает реальные данные компании, список клинеров и usage-summary;
* позволяет обновить профиль компании, добавить/отредактировать клинера;
* подготовлена к загрузке логотипа на сервер.

---

## 19. Locations — единый источник истины

Локации переведены на единый backend-источник истины.  
Frontend больше не использует mock-данные или локальные списки.

Backend для Locations:

* модель, сериализация и CRUD API реализованы и стабильны;
* локации корректно привязаны к Company;
* все job-сущности ссылаются на локации через `location_id`.

Frontend:

* базовый UI (list / create / edit) реализован;
* `LocationsContext` синхронизирован с backend;
* новая локация после создания автоматически доступна:
  * в Job Planning,
  * при создании job,
  * в мобильном приложении (через связанные job’ы);
* новые локации появляются в Create Job и Job Planning без перезагрузки страницы.

Ограничения текущего этапа:

* карта — вспомогательный элемент;
* точность геокодинга и поиск адресов не критичны;
* улучшение карты отложено до появления платящих клиентов или явного фидбэка.

Цель: исключить расхождения данных между экранами и платформами.

---

## 20. Trial & History — текущее состояние разработки

На текущем этапе реализовано:

* **self-serve signup** менеджера;
* автоматический запуск trial;
* backend-ограничения trial **по количеству jobs** (через usage-summary и guards в Create Job API: `trial_jobs_limit_reached`, `trial_expired`, `company_blocked`);
* Job History (backend + UI);
* единый Locations flow (backend → UI → Create Job).

Ключевой принцип:

> Backend — единственный источник истины по trial-состояниям и usage.  
> Frontend не пересчитывает и не дублирует бизнес-логику.

---

## 21. SLA / Exceptions — текущее состояние

В проект добавлен минимальный SLA-слой (**micro-SLA v1**), реализованный полностью на backend.

* SLA вычисляется как derived-статус (`ok` / `violated`) для завершённых jobs.
* Источник — фактические proof-флаги: check-in/out, наличие before/after-фото, чеклист.
* Backend возвращает:
  * `sla_status`;
  * `sla_reasons[]` — machine-readable коды причин  
    (`missing_before_photo`, `missing_after_photo`, `checklist_not_completed` и т.д.).

На frontend SLA используется для:

* визуальной пометки проблемных jobs в Planning и History;
* фильтра “Only problem jobs” в History;
* read-only блока SLA в Job Details  
  (причины как якоря к соответствующим блокам: фото, чеклист и т.п.).

Архитектурно:

* SLA не требует миграций и новых моделей;
* не влияет на execution-логику job;
* готов к расширению  
  (time-based rules, repeated violations, analytics).

---

### Reports & Sidebar UX (v1 → актуальное состояние)

Reports page реализована как read-only aggregation layer поверх существующих job / SLA / performance данных.  
Новая бизнес-логика **не дублируется на фронте** — backend остаётся source of truth.

Frontend updates:

- Added collapsible sidebar (expanded / icon-only mode)
- Sidebar state persisted via localStorage
- Main layout supports full-width content when sidebar is collapsed
- Reports page включает owner overview и manager-level summaries
- Reports и Email actions подключены к backend (см. разделы ниже про Email PDF, Reports Email и Email history).

Known limitations:

- Layout width до конца не унифицирован: некоторые старые страницы всё ещё используют max-width контейнеры.
- Визуальное выравнивание и консистентность графиков/таблиц могут дорабатываться без изменения логики.

Current state считается стабильным и подходящим для демо и ранних клиентов.

---

## 23. Performance Layer (SLA Aggregation)

Поверх SLA добавлен минимальный performance-слой для управленческого анализа.

Backend:

* агрегирует SLA-нарушения по клинерам и локациям;
* учитывает только `completed` jobs за выбранный период;
* считает:
  * `jobs_total`,
  * `jobs_with_sla_violations`,
  * `violation_rate` (violations / jobs_total),
  * `has_repeated_violations`  
    (≥2 violations с одинаковым reason-code за период).

Frontend:

* получает готовые агрегаты;
* не делает собственных вычислений и агрегаций.

Performance Layer — расширение SLA и Job History:

* без миграций;
* без новых бизнес-сущностей;
* не меняет execution-логику.

---

## 24. SLA Reports (Implementation Notes)

Weekly и monthly SLA-отчёты — тонкий аггрегационный слой поверх существующей SLA/Performance-логики.

Принципы:

* SLA-логика не дублируется; отчёты используют общие helpers.
* Backend — единственный источник истины для:
  * диапазонов дат,
  * фильтрации только `completed` jobs,
  * статуса SLA и reason-кодов.
* UI и PDF потребляют **один и тот же aggregated dataset**.

PDF:

* генерируется через ReportLab;
* использует тот же data structure, что и JSON-отчёты;
* загрузка логотипа компании реализована в Company settings,  
  рендер логотипа в PDF может добавляться без изменения основного контракта.

Отчёты:

* read-only;
* предназначены для внешнего шеринга (owners, stakeholders);
* не используются как операционный workflow.

---

## 25. Reports → Evidence drill-down

Reports → Evidence drill-down реализован как отдельный read-only слой.

Специальный endpoint позволяет менеджерам переходить от агрегированных SLA-метрик  
(weekly / monthly reports) к списку конкретных jobs, вызвавших конкретное SLA-нарушение.

Frontend:

* отдельная страница violations (`/reports/violations`);
* вход только через контекстную навигацию (reason / cleaner / location + period);
* используется `JobSidePanel` для быстрого просмотра job без ухода со страницы.

Важно:

Мобильное приложение сейчас жёстко требует наличие фото и прохождение чеклиста перед чек-аутом.  
Поэтому часть SLA-кодов (например, `missing_*`) в нормальном флоу встречается редко и остаётся доменной моделью для:

* future policy changes,
* force-complete сценариев,
* legacy-данных.

---

## 26. Назначение документа

Этот документ — единая инструкция для:

* frontend (web),
* mobile cleaner app,
* любого разработчика, подключающегося к API.

Документ отвечает на вопросы:

* как аутентифицироваться;
* какие эндпоинты использовать;
* какие статусы и ошибки ожидать;
* что является истиной поведения системы.

**Backend — единственный источник истины.**

---

## 27. Base URL

### Local

`http://127.0.0.1:8001`

---

## 28. DEV-аккаунты (ОБЯЗАТЕЛЬНО)

### Cleaner

email: `cleaner@test.com`  
password: `Test1234!`  
role: `cleaner`

### Manager

email: `manager@test.com`  
password: `Test1234!`  
role: `manager`

---

## 29. Auth

### Login (Cleaner / Manager)

`POST /api/auth/login/`

**Payload**

```json
{
  "email": "cleaner@test.com",
  "password": "Test1234!"
}
````

**Response**

```json
{
  "token": "abc123...",
  "user_id": 3,
  "email": "cleaner@test.com",
  "full_name": "Alex Cleaner",
  "role": "cleaner"
}
```

**Использование токена**

Во всех запросах:

```http
Authorization: Token <token>
```

---

## 30. Jobs — Cleaner Flow

### Today Jobs (Cleaner)

`GET /api/jobs/today/`

Возвращает:

* только jobs текущего cleaner;
* только актуальные на сегодня.

---

## 31. Контракт `/api/jobs/today/` (CRITICAL)

⚠️ Контракт **ПЛОСКИЙ**.

Ответ **НЕ** содержит вложенных объектов.

Пример:

```json
[
  {
    "id": 5,
    "location__name": "Dubai Marina Tower",
    "scheduled_date": "2026-01-17",
    "scheduled_start_time": null,
    "scheduled_end_time": null,
    "status": "scheduled"
  }
]
```

Frontend / Mobile:

* не ожидать `location` object;
* не ожидать `cleaner` object;
* использовать поля ровно как есть.

Контракт зафиксирован и не будет меняться.

Почему важно: незнание этого контракта ломает UI.

---

## 32. Job Detail (Cleaner)

`GET /api/jobs/<id>/`

Содержит:

* location;
* cleaner;
* scheduled / actual time;
* `checklist_items`;
* `photos`;
* `check_events`;
* SLA-поля, если job завершён.

---

## 33. Job Detail — гарантии и NULL-поля

Могут быть `null`:

* `actual_start_time`,
* `actual_end_time`,
* `photos` (могут быть пустыми),
* `check_events` (если действий ещё не было).

Frontend обязан:

* корректно рендерить пустые состояния;
* не считать отсутствие данных ошибкой.

---

## 34. Job Statuses

Возможные статусы:

* `scheduled`
* `in_progress`
* `completed`

Жёсткие переходы:

```text
scheduled → in_progress → completed
```

Других переходов не существует.

---

## 35. Check-in / Check-out (CRITICAL)

### Check-in

`POST /api/jobs/<id>/check-in/`

**Payload**

```json
{
  "latitude": 25.0763,
  "longitude": 55.1345
}
```

Условия:

* только роль `cleaner`;
* job принадлежит этому cleaner;
* `job.status == "scheduled"`;
* расстояние до location ≤ 100 м.

Результат:

* `job.status → in_progress`;
* создаётся `JobCheckEvent (check_in)`.

---

### Check-out

`POST /api/jobs/<id>/check-out/`

**Payload** аналогичен check-in.

Условия:

* `job.status == "in_progress"`;
* все required checklist items == `completed`;
* proof условия по фото соблюдены (before / after).

Результат:

* `job.status → completed`;
* создаётся `JobCheckEvent (check_out)`.

---

## 36. Edge case: GPS недоступен

Если координаты не получены:

* API вернёт `400 Bad Request`.

Frontend / Mobile:

* показывает ошибку пользователю;
* предлагает повторить попытку;
* не делает автоповторов без ведома пользователя.

---

## 37. Checklist

Checklist — snapshot, привязанный к job.

`JobChecklistItem`:

* `text`
* `is_completed`
* `is_required`

Правила:

* checklist создаётся при создании job из шаблона;
* редактировать checklist items может только cleaner (toggle / bulk);
* manager читает, но не правит чеклист job;
* required-пункты проверяются при check-out и участвуют в SLA.

---

## 38. Checklist system — DONE (MVP scope)

Реализована полноценная система чек-листов для jobs:

* шаблоны чек-листов хранятся на уровне компании;
* каждый шаблон состоит из набора обязательных/необязательных пунктов;
* шаблоны автоматически доступны менеджеру при создании job;
* дефолтный набор чек-листов создаётся автоматически для новых компаний без ручной настройки.

Это закрывает ключевой MVP-сценарий:
менеджер может создавать jobs с корректным чек-листом сразу после регистрации, без админских действий и ручной инициализации данных.

---

## 39. Photos — Mobile + Backend DONE

Mobile + backend-поток фотографий полностью рабочий:

– Check-in переводит job в in_progress, создаётся JobCheckEvent.
– На экране Job Details появляются слоты Before / After.
– Фото выбирается через expo-image-picker и отправляется как FormData:
– поле `photo_type = before` или `after`,
– поле `file` = бинарник файла.
– Токен авторизации успешно уходит и для JSON, и для multipart-запросов
(`Authorization: Token <token>`).

Правила на backend (факт):

– Фото может загружать только назначенный cleaner.
– Загружать можно только при `status = in_progress`.
– Ровно одно фото на тип: before и after.
– `after` нельзя загрузить, если ещё нет `before`.
– Если в EXIF есть координаты, расстояние до location проверяется (≤ 100 м).
– EXIF может отсутствовать — тогда загрузка разрешена,
а в ответе флаг `exif_missing = true`.

---

## 40. Фактическое хранилище файлов

```
/media/company/<company_id>/jobs/<job_id>/photos/<type>/<uuid>.<ext>
```

---

## 41. Интеграция с Mobile

Экран Job Details показывает:

– статус (scheduled / in_progress / completed),
– прогресс (check-in, before, checklist, after, check-out),
– timeline из JobCheckEvent,
– состояние фото (uploaded / no photo yet),
– чек-лист с возможностью отмечать пункты,
– SLA-блок (status + reasons),
– кнопку для Job PDF.

Check-out с мобильного:

* возможен только при соблюдении порядка действий,
* требует both photos и полного чеклиста.

---

## 42. Фото: нормализация формата

Фото на backend приводятся к единому JPEG-формату (normalize), поэтому:

* web и PDF отображают одинаково;
* исчезла нестабильность “на одном устройстве ок, на другом нет”;
* закрыт прошлый болезненный костыль.

---

## 43. PDF отчёт

`POST /api/jobs/<id>/report/pdf/`

Генерация через ReportLab.

PDF содержит:

* job;
* location;
* cleaner;
* scheduled / actual timestamps;
* checklist;
* audit events;
* SLA-блок;
* фото.

PDF используется и в UI (download), и в email-отправке.

---

## 44. Manager: Planning + Create Job

### Manager Job Planning — backend + frontend DONE

Backend:

**GET /api/manager/jobs/planning/?date=YYYY-MM-DD**

* принимает `YYYY-MM-DD` и `DD.MM.YYYY`;
* отдаёт jobs за дату с:

  * location `{id, name, address}`,
  * cleaner `{id, full_name, phone?}`,
  * status,
  * proof (флаги выполнения).

**GET /api/manager/meta/**

Один справочный запрос для формы Create Job:

* cleaners;
* locations;
* checklist_templates.

**POST /api/manager/jobs/**

* создаёт Job;
* создаёт snapshot JobChecklistItem из ChecklistTemplateItem;
* возвращает payload, пригодный для таблицы Planning.

---

## 45. Proof-контракт (важно, зафиксировано)

Backend возвращает proof как:

* старые ключи:
  `before_uploaded`, `after_uploaded`, `checklist_completed`
* синхронизированные ключи под UI:
  `before_photo`, `after_photo`, `checklist`

Это сделано, чтобы фронт не ломался и не зависел от переименований.

---

## 46. Frontend (dubai-control) — факт

Экран `/planning`:

* загружает jobs по дате;
* фильтр по статусам (локально);
* proof отображается корректно;
* JobSidePanel показывает данные job;
* Create Job Drawer:

  * тянет meta,
  * создаёт job,
  * job появляется в таблице без перезагрузки.

---

## 47. Mobile Cleaner App — текущий статус

Технологии:

* Expo
* React Native
* TypeScript
* React Navigation (Native Stack)

Что работает (ФАКТ):

* Login
* Today Jobs
* Job Details
* Check-in / Check-out
* Checklist toggle / completion
* Реальная интеграция с backend
* Token хранится in-memory

---

## 48. Manager Portal — зафиксировано

* React + Vite
* TypeScript
* Tailwind
* shadcn/ui
* API-first

Статус:

Manager Portal MVP визуально и архитектурно завершён.

---

## 49. Job Planning — текущий факт (обновлено)

Статус: работает end-to-end (read-only идеал + Create Job).

Что есть:

* маршрут `/planning` + пункт в навигации;
* таблица jobs за дату (backend — источник истины);
* proof-флаги (Before / After / Checklist) синхронизированы с API;
* сайдпанель (`JobSidePanel`) показывает данные job;
* Create Job Drawer подключён к backend:

  * `GET /api/manager/meta/`
  * `POST /api/manager/jobs/`

Примечание:

Job Planning сейчас не редактирует существующие job’ы, только:

* просмотр;
* создание новых;
* переход в Job Details.

---

## 50. Принципиальное решение по Job Planning (ЗАФИКСИРОВАНО)

Job Planning — инструмент менеджера.

Cleaner не получает “уведомление”, а:

* видит job через `GET /api/jobs/today/`;
* backend остаётся источником истины.

Никакой push-логики и автоматических рассылок в MVP.

---

## 51. Принцип работы с Lovable (ЗАФИКСИРОВАНО)

Lovable используется как:

* генератор эталонного UI;
* источник UX-референсов.

Правила:

Lovable **не** источник истины.
API и логика — только репозиторий.

Используется для:

* новых экранов;
* крупных UI-итераций.

---

## 52. Что НЕЛЬЗЯ делать ❌

Запрещено:

* переписывать auth;
* переписывать jobs;
* переписывать check-in / check-out;
* менять модели;
* трогать миграции;
* предлагать Celery / async / очереди;
* «рефакторить ради красоты»;
* переименовывать proof-поля в API без слоя совместимости.

Proof-поля уже использует фронт.
Если меняем контракт — только добавлением новых полей или маппингом.

---

## 53. Что делать в НОВОМ ЧАТЕ (TODO)

🎯 Фокус: довести Manager Planning / Reports / Analytics до “операционного уровня”, без расширения scope.

Принцип:

* любые новые чаты по продукту стартуют с актуального MASTER BRIEF;
* DEV_BRIEF не содержит текстов “скопируй вот это в новый чат”, а только инварианты и факты.

---

## 54. Что НЕ коммитили осознанно

Backend-миграции и admin-утилиты изменялись в ходе разработки, но не зафиксированы в git.

Их состояние проверяется и коммитится отдельным шагом после стабилизации API и планирования.

---

## 55. Закрытые костыли (боль, которую больше не трогаем)

* парсинг даты для planning (поддержка `DD.MM.YYYY`);
* proof-флаги backend ↔ frontend синхронизированы;
* Create Job — не заглушка;
* фото с разных телефонов нормализованы в JPEG.

---

## 56. С ЧЕГО НАЧАТЬ НОВЫЙ ЧАТ (meta)

Этот раздел больше **не содержит** конкретного текста для копирования.
Правило:

* для любого нового технического чата использовать актуальный `MASTER_BRIEF.md` из репозитория;
* не копировать устаревшие примеры из DEV_BRIEF;
* DEV_BRIEF = инварианты и факты, MASTER_BRIEF = сценарий конкретной сессии.

---

## 57. Mobile / Cleaner App — текущее состояние

Что уже работает (фактически):

* Экран Job Details полностью функционален:

  * статусы (`scheduled → in_progress → completed`);
  * чек-ин / чек-аут;
  * before / after фото;
  * чеклист с обязательными пунктами;
  * таймлайн событий;
  * PDF-отчёт формируется и корректно отображает фото.

* Навигация Navigate отображается и использует реальные координаты локации.

* Логика важнее дизайна — визуал осознанно упрощён.

---

## 58. Текущий фокус работы (Mobile — Layer 1)

### Цель

Закрыть Слой 1 — мобильное исполнение (logic-complete),
без финального UI-дизайна.

### В работе сейчас

**Навигация**

* Подключить реальные координаты локации из backend:

  * `location_latitude`
  * `location_longitude`
* Поведение:

  * координаты есть → открывается Apple / Google Maps;
  * координат нет → Navigate disabled.

**Камера / галерея**

* обновить ImagePicker:

  * убрать deprecated `MediaTypeOptions`;
  * использовать `ImagePicker.MediaType.IMAGE`;
* добавить стабильные состояния загрузки;
* корректная обработка ошибок.

**Превью фото**

* мини-превью before / after;
* `No photo yet`, если отсутствует.

**Guard rails UI**

* Check-in — только для `scheduled`;
* Check-out — только для `in_progress`;
* `completed` — read-only.

---

## 59. QA + фиксация

Прогон сценариев:

1. полный happy-path job;
2. попытки нарушить порядок действий;
3. job без координат.

После этого:

* обновить `PROJECT_STATE.md`;
* пометить Mobile Layer 1 как ✅ завершённый.

---

## 60. Важная договорённость

Дизайн мобильного приложения будет делаться ПОСЛЕ:

* закрытия Layer 1 (логика);
* стабилизации API;
* фиксации UX-поведения.

Текущие упрощения UI — осознанные и временные.

---

## 61. Locations — принципиальное решение

Locations считаются закрытой backend-сущностью:

* backend — единственный источник истины;
* frontend не хранит mock-локации;
* все job-сценарии используют `location_id`.

Карта:

* утилитарный элемент;
* для ориентации, GPS-валидации и PDF.

Приоритет:

* monetization readiness;
* trial → paid конверсии;
* доказательная ценность proof-of-work.

---

## 62. Manager Meta (Create Job prerequisites)

Эндпоинт `GET /api/manager/meta/` возвращает:

* cleaners;
* locations;
* checklist_templates (только с items).

Если валидных шаблонов нет:

* автоматически создаётся дефолтный набор чеклистов;
* повторно возвращается в ответе.

Фронтенд всегда получает консистентный список чеклистов
без fallback-логики.

---

## 63. Checklist templates — роль в системе

Checklist templates используются:

* при создании job;
* при выполнении job клинером;
* при расчёте SLA (`checklist_not_completed`).

Автоматически создаются для новых компаний
и не требуют ручной настройки.

---

## 64. Pricing & Upgrade Flow (Pre-billing)

Pricing и Upgrade-флоу:

* интегрированы с `usage-summary`;
* различают анонимов, trial и expired trial;
* после trial Standard-план — точка коммерческого диалога.

Флоу временный и готов к Stripe / Paddle
без изменения backend-контрактов.

---

## 65. Фактический статус продукта

CleanProof — устойчивый операционный продукт без биллинга:

* backend-ядро job execution закрыто;
* Manager Portal покрывает Planning / Job Details / History;
* self-serve signup + честный trial;
* архитектура готова к биллингу.

---

## 66. SLA / Quality Control (micro-SLA v1)

SLA — вычисляемый backend-слой:

* `sla_status` (`ok` / `violated`);
* `sla_reasons`.

Встроен в Planning, History и Job Details.

Переводит продукт из “хранилища доказательств”
в систему активного контроля качества.

---

## 67. Performance Layer — управленческий контроль качества

В CleanProof реализован Performance Layer как следующий уровень после SLA.

Ключевая идея слоя — не аналитика ради графиков, а ответы на управленческие вопросы:

* где возникают системные проблемы;
* кто регулярно нарушает SLA;
* являются ли нарушения случайными или повторяющимися.

Performance Layer:

* агрегирует SLA-нарушения по клинерам и локациям;
* показывает относительные показатели (`violation rate`), а не только абсолютные числа;
* выявляет повторяемость нарушений на основе reason-codes;
* полностью основан на существующих job-данных и SLA-вычислениях.

Слой реализован без усложнения архитектуры и логически замыкает цепочку:

Job execution → SLA → Performance → History → Evidence

Это усиливает ценность CleanProof как системы контроля качества,
а не просто хранилища отчётов.

---

## 68. Checklist templates в Job Planning

В планировании задач менеджер работает не с “сырым” чеклистом,
а с заранее подготовленными шаблонами:

* Apartment – Standard (6 items)
* Apartment – Deep (12 items)
* Office – Standard (8 items)
* Villa – Full (12 items)

Эти шаблоны живут на уровне компании и поднимаются в одном месте —
через `GET /api/manager/meta/`.

Ответ эндпоинта содержит:

* список клинеров (`cleaners`);
* список локаций (`locations`);
* список чеклист-шаблонов (`checklist_templates`) с:

  * превью первых пунктов,
  * количеством items.

В UI создания job:

* менеджер выбирает чеклист из выпадающего списка
  с превью первых задач (`items_preview` + `+ N more`);
* ниже показывается блок **CHECKLIST DETAILS**
  с названием шаблона и разворачиваемым списком пунктов.

---

## 69. Связь checklist templates и SLA

Это делает связь SLA-метрики `checklist_not_completed` прозрачной:

* всегда понятно,
* какой именно чеклист был выбран,
* сколько пунктов должно быть закрыто.

---

## 70. Checklist templates as part of SLA proof system

Checklist templates являются базовым элементом системы доказательств выполнения работ (proof of work).

Они:

* задают ожидаемый объём и состав работ;
* напрямую влияют на SLA-оценку.

Связка:

Create Job → Select Checklist Template → Job Checklist Items
→ Checklist Completion → SLA Status

Менеджер видит эту связь:

* в списках jobs (Planning / History);
* в JobSidePanel;
* в отчётах и violation views.

Это обеспечивает объяснимость SLA-нарушений без ручных проверок.

---

## 71. SLA Reports (Value Layer)

SLA Reports package operational evidence into a manager-ready format.

They:

* do not introduce new business logic;
* reframe execution, SLA and performance data into:

  * weekly summaries;
  * monthly summaries;
  * accountability by cleaner and location;
  * exportable PDF reports.

This layer closes the loop:

Execution → SLA → Performance → Reports → Evidence

Reports strengthen perceived product value
without increasing system complexity.

---

## 72. Job reporting & email delivery (v1)

Managers can generate, download, and email verified job reports.

* PDF reports are generated on the backend from real execution data.
* The same PDF source is used for UI download and email delivery.
* “Email PDF” sends the report directly to the manager’s email by default.
* Optionally, менеджер может указать кастомный email.

This enables a simple one-click operational workflow:

manager → verified report → inbox.

This functionality is fully implemented end-to-end
and represents a completed manager-facing feature.

---

## 73. Reports & Email (v1 completed)

CleanProof поддерживает отправку PDF-отчётов по email как часть операционного workflow:

* Job PDF — отправка в один клик;
* Weekly и Monthly performance reports — отправка из Reports UI;
* все PDF формируются backend’ом и используют те же данные, что и UI.

Email-отправка:

* ориентирована на операционные сценарии;
* не является маркетинговой рассылкой.

---

## 74. Reports v2 — Email Delivery & Audit (Completed)

Reports v2 расширяет слой Reports реальной доставкой и аудитом.

Что реализовано:

* менеджер может отправлять:

  * job PDF,
  * weekly reports,
  * monthly reports;
* выбор получателя:

  * свой email,
  * кастомный email;
* backend генерирует PDF из одного источника;
* каждая отправка логируется с полным контекстом;
* отправка работает с любым SMTP backend’ом.

Это замыкает цепочку:

Execution → SLA → Reports → PDF → Email → Audit Trail

Ограничение:

* фактическая доставляемость зависит от SMTP.

---

## 75. Reports → Evidence layer (Completed)

Система поддерживает полный drill-down:

Report → SLA reason → affected jobs → job details

Слой:

* read-only;
* не вмешивается в execution;
* усиливает управленческую прозрачность.

SLA-причины, связанные с proof completeness, сохранены как доменная модель
для future overrides, policy changes и legacy-данных.

---

## 76. Email delivery of proof

CleanProof поддерживает доставку доказательств выполнения работ по email.

* Job PDF может быть отправлен:

  * себе,
  * внешнему получателю;
* email содержит полный proof + SLA-статус;
* каждая отправка фиксируется в системе.

Email PDF — часть доказательной цепочки,
а не просто уведомление.

---

## 77. Job PDF как доказательная карточка

Job PDF отражает полную доказательную картину выполнения job:

* факты;
* фото;
* чеклист;
* аудит;
* SLA.

SLA:

* вычисляется backend’ом;
* не является UI-симуляцией.

В нормальном сценарии:

* SLA OK без нарушений.

SLA violated:

* поддерживается для audit- и override-сценариев.

Job PDF — внешний, неподдельный артефакт доверия
для owner’ов и клиентов.

---

## 78. Job PDF & Email Proof (v1 завершён)

Закрыт блок PDF Job Report + Email Proof:

* PDF отражает фактическое выполнение;
* email-отправка логируется;
* менеджер может доказать факт отправки отчёта;
* история отображается в Job Details и в Email history.

Ограничение:

* email history — только в контексте продукта, не маркетинг.

---

## 79. Reporting & Management UX — Status

Reporting реализован как first-class management feature.

Что сделано:

* owner overview с агрегированными KPI;
* weekly / monthly reports;
* разделение owner / manager ответственности;
* collapsible sidebar;
* явная обработка trial / company-blocked состояний.

Важно:
Reports — объясняющий и доказательный слой,
а не инструмент операционного управления.

---

## 80. Role-based responsibility model

Managers:

* генерируют и рассылают отчёты.

Owners:

* получают агрегированные инсайты;
* не управляют генерацией отчётов.

Owner overview в UI:

* визуальное отражение данных PDF;
* не отдельный формат отчёта.

---

## 81. Email history — manager-facing audit trail

Email history реализован как управленческий инструмент:

* единая история всех отправленных отчётов;
* фильтры:

  * дата отправки,
  * тип отчёта,
  * job / период,
  * получатель,
  * статус доставки;
* фильтрация по `created_at`, а не по дате job;
* готово к расширению (retry, диагностика ошибок).

---

## 82. Commercial enforcement & read-only mode

Коммерческие ограничения enforced **только backend’ом**.

* `Company.is_active` управляет доступом;
* suspended company:

  * data доступна,
  * mutating actions заблокированы;
* API возвращает:

  * `company_blocked`,
  * `trial_expired`,
  * `trial_jobs_limit_reached` (для trial-jobs лимита).

Frontend:

* не выводит это как “системную ошибку”;
* отображает read-only / upgrade UX;
* даёт объясняющие сообщения и CTA.

---

## 83. Cleaner access & security model

Cleaner access:

* manager-controlled;
* без self-signup;
* без recovery.

Менеджер:

* создаёт клинера;
* активирует / деактивирует;
* сбрасывает PIN.

Модель:

* быстрая,
* надёжная,
* подходит для MVP и рынков без email.

---

## 84. Force-complete / override (manager-only)

### Зачем

Реальные сценарии:

* нет after-photo;
* чеклист формально не закрыт;
* потеря доказательств.

Без override:

* либо ломается SLA,
* либо job зависает.

---

## 85. Force-complete — решение

* кнопка доступна только менеджеру;
* обязательны:

  * `reason_code`,
  * `comment`;
* job → `completed`;
* SLA → `violated`;
* причина явно фиксируется.

---

## 86. Что даёт Force-complete

* SLA становится честным;
* owner видит реальную картину;
* audit trail прозрачен.

Формула:

> Managers can override the process, but overrides всегда видны owner’у.

---

## 87. SLA philosophy: proof-first

CleanProof:

* не ищет ошибки,
* предотвращает их.

Большинство jobs:

* без SLA-нарушений.

Violations:

* только как исключения.

“No violations”:

* положительный audit-результат,
* часть позиционирования.

---

## 88. Force-complete — controlled exception handling

Force-complete:

* не workaround,
* не скрывает проблемы,
* всегда видим в отчётах.

---

## 89. SLA модель и принудительное завершение

Job имеет два измерения:

* `status` — lifecycle;
* `sla_status` / `sla_reasons` — качество выполнения.

Happy-path:

* SLA OK.

Exception-path:

* SLA violated + причины.

Force-complete:

* только manager;
* всегда violation;
* всегда аудируемо.

### SLA Engine & Analytics

* Любая новая SLA-логика должна проходить через
  `compute_sla_status_and_reasons_for_job(job)`.
* Analytics-эндпоинты используют только этот helper для определения:

  * `issues_detected` (summary),
  * `issues` (cleaners-performance),
  * причины нарушений (sla-breakdown).

Если добавляется новый SLA-код (например, `too_short_duration`),
нужно:

1. Добавить его в SLA Engine (helper).
2. Убедиться, что он попадает в:

   * `analytics_sla_breakdown` (`reasons`),
   * отчёты (top_reasons).
3. Обновить документацию по SLA-кодам (список причин).

---

## 90. Analytics Page — назначение и границы

Analytics — отдельный управленческий экран, не замена Reports.

Назначение Analytics:

* быстрое понимание состояния операций;
* сравнение клинеров;
* выявление трендов.

Analytics **не**:

* не источник доказательств;
* не отчёт для внешних сторон;
* не место для SLA-аудита.

Reports остаются:

* доказательным слоем;
* экспортируемым форматом;
* основой для owner-коммуникации.

---

## 91. Analytics — архитектурный принцип

Analytics:

* read-only;
* полностью derived из backend-агрегаций;
* не содержит собственной бизнес-логики.

Frontend:

* не считает агрегаты;
* не нормализует данные;
* не “догадывается”.

Любая цифра в Analytics:

* должна быть повторяема;
* должна совпадать с backend-данными;
* должна быть объяснима через jobs и SLA.

---

## 92. Analytics — текущая реализация

Реализовано:

* маршрут `/analytics`;
* KPI summary;
* trends-графики;
* таблица performance клинеров;
* comparison chart;
* корректная работа layout при свёрнутом sidebar.

API:

* `GET /api/manager/analytics/summary/`;
* `GET /api/manager/analytics/cleaners-performance/`.

Frontend:

* использует реальные backend-данные;
* при ошибках показывает fallback-моки;
* не блокирует UI.

---

## 93. Analytics — сознательные ограничения

На текущем этапе **не реализовано**:

* кастомный выбор периода;
* drill-down до job;
* экспорт данных;
* owner-only analytics.

Это осознанно:
Analytics — инструмент ежедневного обзора,
а не глубокой проверки.

---

## 94. Analytics ↔ Performance ↔ SLA

Связка:

Jobs → SLA → Performance → Analytics

* SLA — бинарная оценка корректности;
* Performance — агрегация по людям и местам;
* Analytics — визуализация.

Разрыв логики запрещён.

---

## 95. DEV_BRIEF — invariants (НЕ НАРУШАТЬ)

Это системные инварианты.
Любые изменения должны им подчиняться.

### Backend

* Backend — **единственный источник истины**.
* Никакая логика не дублируется на фронте.
* Все мутации идут через API.
* Контракты backward-compatible.

### Frontend

* Не вычисляет бизнес-логику.
* Не меняет статус job локально.
* После mutating action — refetch.
* Ошибки API не скрываются.

### Mobile

* Не нарушает порядок действий.
* Не обходит GPS-валидацию.
* Не завершает job без proof и чек-листа.

---

## 96. DEV_BRIEF — Job Details stability rules (recap)

Экран Job Details:

* единая точка исполнения;
* секции — dumb components;
* логика — сверху.

После любого действия:

* refetch job;
* обновление из backend-ответа.

---

## 97. GPS — окончательные правила

* DEV:

  * можно подставлять координаты job;
* PROD:

  * только реальные координаты устройства.

Запрещено:

* инлайнить GPS в экранах;
* менять distance-check;
* маскировать ошибки.

---

## 98. Photos — окончательные правила

* Только через ImagePicker;
* Только при `in_progress`;
* Только before → after;
* EXIF может отсутствовать;
* EXIF отсутствует ≠ ошибка.

---

## 99. Checklist — окончательные правила

* Checklist = snapshot;
* источник — template;
* required-пункты обязательны;
* влияет на SLA;
* менеджер не редактирует job checklist.

---

## 100. Trial — философия и UX

Trial — не блокировка, а контекст.

Принципы:

* пользователь не “наказывается”;
* данные всегда доступны;
* ограничения мягкие (кроме явных backend-кодов);
* апгрейд — предложение, не ультиматум.

---

## 101. Trial expired ≠ ошибка

После истечения trial:

* пользователь остаётся в системе;
* может просматривать данные;
* может анализировать работу;
* получает объясняющий UX.

---

## 102. Soft-limits — правило

Soft-limits:

* обучают ценности тарифа;
* не ломают рабочий процесс на фронте;
* не создают стресс.

Технические блокировки — только по решению backend’а и через error codes.

---

## 103. Commercial enforcement — summary

* enforced backend’ом;
* выражается через error codes;
* фронт читает код, а не текст;
* UX = read-only mode + upgrade options.

---

## 104. Security model — итог

* менеджер — root-доступ в компании;
* клинер — исполнитель без self-service;
* owner — потребитель отчётов.

Минимум поверхностей атаки,
максимум контроля.

---

## 105. Product scope — зафиксировано

CleanProof на текущем этапе:

* операционный SaaS;
* без биллинга;
* с реальной ценностью;
* с доказательствами выполнения работ;
* с управленческой аналитикой.

---

## 106. Что считается DONE

* Job execution — DONE;
* Proof (photos, checklist, GPS) — DONE;
* SLA — DONE;
* Reports + PDF + Email + Audit — DONE;
* Planning — DONE;
* Analytics v1 — DONE.

---

## 107. Что намеренно НЕ делали

* биллинг;
* автоматические уведомления;
* сложные роли;
* оффлайн-очереди (кроме задела);
* маркетинговую автоматику.

---

## 108. Принцип развития дальше

Любое развитие должно:

* не ломать execution;
* не размывать SLA;
* усиливать доказательность;
* повышать доверие.

---

## 109. Итоговая формула продукта

> CleanProof — это система,
> где выполнение работы важнее интерфейса,
> доказательства важнее обещаний,
> а качество измеримо, а не декларируется.

---

## 110. Финальное правило

Если возникает сомнение:

**“Это упрощает жизнь менеджеру,
не ломая правду backend’а?”**

Если нет — изменение не принимается.

---

## 111. API module structure

The API layer for the manager / cleaner apps is split into several view modules
to keep `backend/apps/api/views.py` small and maintainable:

* `backend/apps/api/views_auth.py`
  Auth & session endpoints:

  * cleaner PIN login and email+password login
  * manager login & signup

* `backend/apps/api/views_cleaner.py`
  Cleaner-facing mobile API:

  * today jobs list, job details
  * check-in / check-out flows
  * checklist toggle / bulk update
  * before/after photo upload & delete
  * job PDF report download for the cleaner

* `backend/apps/api/views_manager_company.py`
  Company profile & team management:

  * manager company profile (GET / PATCH)
  * company logo upload
  * cleaners CRUD (list/create/update)
  * PIN reset for cleaners

* `backend/apps/api/views_manager_jobs.py`
  Manager-facing job lifecycle & planning:

  * create job, today jobs list
  * manager job details
  * planning / history lists (same payload helper)
  * SLA helpers and force-complete endpoint
  * performance views by cleaners / locations
  * SLA violations jobs report

* `backend/apps/api/views_reports.py`
  Reporting & email:

  * job PDF report download & email sending
  * weekly / monthly SLA reports (JSON + PDF)
  * owner overview
  * global report email log table
  * weekly / monthly report email endpoints

The main `backend/apps/api/views.py` file is now a thin entry point that:

* re-exports public API views from the modules above (for `urls.py` imports),
* contains only:

  * default checklist templates for new companies,
  * the `create_default_checklist_templates_for_company()` helper,
  * `ManagerMetaView` (bootstrap meta for the dashboard: cleaners, locations, checklist templates).

---

## Jobs vs Job History (operational vs archive)

The **Jobs** page is an operational view intended for day-to-day management.

* **Today** — jobs scheduled for the current date.
* **Upcoming** — jobs scheduled for future dates.
* **Completed** — только недавние завершённые jobs (дефолтное окно — ~30 дней).

Jobs page **намеренно не показывает** всю историю, чтобы:

* не перегружать UI;
* не тянуть лишние данные.

The **Job History** page — авторитетный архив:

* произвольные диапазоны дат,
* расширенные фильтры,
* полный исторический dataset без лимитов по времени.

---

## Reports (Frontend)

Страница Reports разделена на:

* **Owner view** — read-only summary без drill-down;
* **Manager view** — weekly/monthly SLA-отчёты с actionable-блоками (Top reasons, Cleaners, Locations).

Вкладка Email history (`/reports/email-logs`) приведена к тому же уровню строгости, что и Reports:
единый журнал всех job/weekly/monthly писем с фильтрами и статусами.

Layout:

* В AppLayout увеличена максимальная ширина контента,
  чтобы таблицы Reports и Email history визуально доходили до сайдбара
  и не оставляли “пустого поля”.

---

## SLA Reports → Violations Drill-down (Frontend)

Реализован сценарий перехода от агрегированных SLA-метрик к списку конкретных задач с нарушениями.

На странице Reports кликабельными entry-point’ами являются:

* элементы блока **Top SLA reasons**
* строки в блоке **Cleaners with issues**
* строки в блоке **Locations with issues**

Каждый entry-point формирует переход на `ViolationJobsPage` с передачей:

* `period_start`
* `period_end`
* одного фильтра: `reason`, `cleaner_id` или `location_id`

### ViolationJobsPage

Страница:

* валидирует входные query-параметры;
* вызывает `getViolationJobs`;
* отображает таблицу job’ов с нарушениями SLA;
* использует `JobSidePanel` для быстрого просмотра (Quick view);
* маппит данные reports-эндпоинта в минимальный `PlanningJob` без дополнительных backend-запросов.

Логика страницы строго read-only, без побочных эффектов.

---

## Analytics & SLA layer — done

Завершена разработка backend-логики аналитики и SLA.
Вынесены переиспользуемые расчёты summary-метрик и дельт по периодам.
Все edge-cases (пустые периоды, деление на ноль, отсутствие чеклистов или фото) обработаны на уровне API.

Frontend получает уже нормализованные данные и не содержит бизнес-логики расчётов.
Аналитика строится строго на `completed` jobs, с использованием `actual_start_time` / `actual_end_time` и существующего SLA engine.

```
