# MASTER BRIEF — CleanProof (MVP)

_Актуальная рабочая версия. Этот файл — не история проекта, а снимок текущего состояния и фокуса._
“Этот файл — оперативный хэнд-офф.
Детали см. в MASTER_CONTEXT_*”

## Documentation rules

- API_CONTRACTS.md — versioned API contract with strict CHANGELOG.
- DEV_BRIEF.md — living integration guide with top-level CHANGELOG.
- PROJECT_STATE.md — factual snapshot of the system, no changelog, versioned by file.

---

## 1. Что это за продукт

**CleanProof** — B2B SaaS для клининговых компаний (рынок UAE).

Фокус: не “таск-трекер”, а система доказуемого выполнения работ и управленческого контроля.

Цепочка, которую продукт закрывает:

> Планирование → Исполнение → Доказательства → SLA → Аналитика → Отчёты → Email-доставка

CleanProof не занимается биллингом, маркетингом и CRM — только операционка и доказательства.

Ключевая идея:

> **If it’s not proven, it didn’t happen.**  
> Доказательства = GPS, чек-лист, фото, таймлайн, SLA и PDF.

---

## 2. Архитектура (срез)

**Backend**

- Django, API-first, DRF (`apps.api` — единственный API-слой).
- Auth: TokenAuthentication.
- БД: SQLite локально, схема совместима с PostgreSQL.
- Всё синхронно, без очередей и async.
- Source of truth: статусы job, SLA, отчёты, PDF, роли, commercial flags.

**Manager Portal (web)**

- Репозиторий: `dubai-control`.
- React + TypeScript + Vite, Tailwind, shadcn/ui.
- Только отображение и UX, без бизнес-логики.

**Mobile Cleaner App (expo)**

- React Native + TypeScript.
- Логин, Today Jobs, Job Details, check-in / check-out, фото, чек-лист.
- Жёсткий enforcement: нельзя завершить job без required proof (кроме force-complete со стороны менеджера).

Роли:

- **Manager** — управляет локациями, клинерами, планированием, отчётами.
- **Cleaner** — выполняет jobs через мобильное приложение.

---

## 3. Что уже сделано (слоями)

### 3.1. Execution ядро (jobs / checklist / photos / PDF) — ✅ DONE

- Jobs: `scheduled → in_progress → completed`, backend — истина.
- Check-in / check-out с GPS-валидацией, audit-таймлайном.
- Checklist: шаблоны на уровне компании → snapshot в `JobChecklistItem` → required-пункты проверяются при завершении job.
- Photos: before / after, EXIF-проверка дистанции, нормализация в JPEG, единое хранилище.
- Job PDF: backend-генерация, содержит факты, чек-лист, audit, фото, SLA-статус.
- Force-complete: контролируемый override менеджером, всегда фиксирует SLA-нарушение.

### 3.2. Manager Portal — ✅ MVP готов

- Login / Trial-индикатор / Company settings / Cleaners management.
- Locations: backend-истина, карта — утилитарный слой.
- Job Planning:
  - `/planning` — jobs за дату, proof-флаги, side panel.
  - Create Job Drawer: meta (cleaners, locations, checklist templates) + `POST /api/manager/jobs/`.
- Job Details / Job History:
  - полный просмотр proof, SLA, PDF, email-истории.
  - разделение на **операционный workspace** (Jobs/Planning) и **архив** (Job History).

  #### Locations как опорная сущность

Locations — это не просто справочник адресов, а опорная сущность для доказательств.

* Локация может быть `active` или `inactive`.
* `inactive` означает, что на эту локацию больше нельзя назначать новые jobs.
* Локации с job history нельзя удалять — они остаются в системе для сохранения цепочки доказательств (History, Reports, PDF).
* Менеджер "отключает" локацию через deactivate, а не через delete.

Любые операции, которые приводят к потере связи job → location, считаются недопустимыми.

### Locations — delete protection ✅

- Locations with job history cannot be deleted.
- Database-level protection enforced via `on_delete=PROTECT` on `Job.location`.
- Operational flow: locations are deactivated via `is_active = false` instead of deletion.
- Historical jobs always retain valid location references.

### Locations — address & map behavior ✅

- Основной сценарий создания локации — выбор адреса или объекта через поиск.
- Менеджер вводит адрес / название объекта, получает автодополнение и выбирает нужный вариант.
- После выбора адреса:
  - координаты (latitude / longitude) определяются автоматически;
  - карта центрируется на выбранной точке;
  - маркер устанавливается автоматически.
- Менеджер может вручную скорректировать положение маркера на карте, если требуется.
- Ручной ввод latitude / longitude допускается только как fallback и не является основным сценарием.
- Цель UX — исключить необходимость ручной работы с координатами в 95% случаев.

### Locations — Google Maps integration (2026-02) ✅

- Раздел Locations переведён на Google Maps JavaScript API.
- Адресный поиск реализован через Google Places Autocomplete.
- Выбор адреса автоматически устанавливает latitude / longitude.
- Маркер на карте поддерживает drag-and-drop с обновлением координат.
- Leaflet / OpenStreetMap больше не используются.
- API key подключается через .env.local и подлежит обязательному ограничению (HTTP referrer + allowed APIs).

### Google Maps integration completed with enforced API and billing safeguards.


### 3.3. Trial / Commercial enforcement — ✅ READY

- 7-day trial как UX-сценарий, а не платёжная логика.
- Backend хранит истину по trial status, company activity, блокировкам.
- Read-only режим для заблокированных компаний:
  - данные доступны;
  - создание новых сущностей запрещено.
- Front корректно отображает:
  - активный trial;
  - истёкший trial;
  - заблокированную компанию.

### 3.4. Reports, PDF и Email-доставка — ✅ COMPLETED

- Job PDF: единый формат для UI-скачиваний и email-отправки.
- Weekly / Monthly performance reports (JSON + PDF).
- Email-отправка job / weekly / monthly отчётов:
  - выбор получателя (self / custom email),
  - логирование “кто / что / когда / кому”.
- Email history: менеджерский аудит-трейл отправок.
- UI, PDF и email опираются на один и тот же backend-слой.

### 3.5. SLA Engine & Analytics — ✅ COMPLETED

- SLA-движок на backend (`compute_sla_status_and_reasons_for_job(job)`):
  - `sla_status: ok / violated`;
  - `sla_reasons: string[]` (late_start, missing_after_photo, checklist_not_completed и т.п.).
- Force-complete интегрирован в SLA: override всегда даёт violation.
- SLA-агрегаты:
  - violation rate,
  - top reasons,
  - top cleaners / locations.
- Analytics Page:
  - KPI-карточки,
  - performance breakdown по клинерам,
  - SLA Performance,
  - violation-drilldown до списка конкретных jobs.
- Violation Jobs / Reports / Owner overview — построены поверх одного SLA-ядра.
- Analytics работает как read-only слой над execution-ядром и SLA, без дублирования логики во frontend.

---

## 4. Checklist templates (как часть системы доказательств)

На уровне компании зафиксирован дефолтный набор чек-листов:

- Apartment — Standard (6 items)
- Apartment — Deep (12 items)
- Office — Standard (8 items)
- Villa — Full (12 items)

Шаблоны:

- живут в `ChecklistTemplate / ChecklistTemplateItem`;
- поднимаются через `GET /api/manager/meta/`;
- используются в Create Job как основа для job-чеклиста;
- встроены в SLA через причину `checklist_not_completed`.

Если у компании нет валидных шаблонов, backend создаёт дефолтный набор автоматически, чтобы система была готова к работе “из коробки”.

---

## 5. Фактический статус продукта (коротко)

На сегодня CleanProof — это:

- устойчивый операционный продукт без подключённого биллинга;
- закрытое execution-ядро с доказательствами (GPS, чек-лист, фото, PDF, SLA);
- рабочий Manager Portal (Planning, History, Reports, Analytics);
- мобильное приложение с жёстким enforcement proof-шагов;
- готовый к монетизации skeleton (trial, commercial flags, read-only режим).

Продукт технически готов к пилотам и платным внедрениям после подключения биллинга (Stripe / Paddle) поверх текущего trial / upgrade-флоу.

---

## 6. Текущий фокус (что делать дальше в новом чате)

🎯 **Общий принцип:** не расширять домен, а углублять существующие слои (SLA, Analytics, Checklist, Reports).

Рекомендуемый приоритет на ближайшие итерации:

1. **Checklist v2 / SLA Engine v2 (углубление контроля качества)**
   - уточнить модель Checklist v2 (гибкая конфигурация пунктов, частоты, типов нарушений);
   - связать чек-лист с разными типами SLA-причин (quality vs process);
   - подготовить PRD для Checklist v2 (1–2 страницы) на основе текущей реализации.

2. **Analytics / SLA — UX-доводка**
   - единый date-range selector для Analytics и Violation Jobs;
   - визуальная полировка SLA Performance и violation-drilldown;
   - чёткий “storyline” для менеджера:  
     “KPI → SLA reasons → Violation Jobs → Job Details → Evidence”.

3. **Reports v2.1 (микро-улучшения)**
   - выравнивание текстов и статусов между Owner Overview, manager reports и PDF;
   - минимальные дополнения под реальные пилоты (если появятся).

Эта тройка — основной “операционный backlog” для нового чата.
Биллинг и интеграции осознанно остаются за пределами MVP.

---

## 7. Как стартовать новый чат

Первое сообщение в новом чате должно давать ИИ весь контекст сразу:

> **MASTER BRIEF — CleanProof (MVP)**  
>  
> Контекст:  
> – Execution ядро (jobs, checklist, photos, PDF) полностью DONE  
> – Trial / commercial enforcement работают (read-only для заблокированных компаний)  
> – Manager Portal закрывает Planning, History, Reports и Analytics на живых данных  
> – SLA Engine и Analytics подключены, violation-drilldown работает  
> – Email-отчёты и email-история реализованы end-to-end  
>  
> Цель этого чата:  
> [сюда подставляем конкретный фокус: например, “спроектировать Checklist v2 и его связь с SLA Engine v2 без ломки текущих контрактов”]  
>  
> Ограничения:  
> – модели не ломаем;  
> – миграции аккуратные, без изменения уже использующейся структуры;  
> – backend — единственный source of truth для SLA и Analytics;  
> – никакого дублирования бизнес-логики на frontend.

---

## 8. Где искать подробности

Чтобы не раздувать этот файл, все детальные описания вынесены в отдельные документы:

- `MASTER_CONTEXT_PRODUCT.md` — рынок, философия, маркетинг, trial, reports-philosophy.  
- `MASTER_CONTEXT_EXECUTION.md` — подробные флоу jobs / photos / checklist / mobile / manager portal.  
- `MASTER_CONTEXT_SLA_ANALYTICS_REPORTS.md` — полный SLA Engine, Performance Layer, Analytics Page, Reports, Violation Jobs, email-audit.

Этот файл всегда остаётся коротким и описывает только **текущий срез и фокус**.
