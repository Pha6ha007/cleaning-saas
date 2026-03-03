# MASTER TASK: Proof Platform — Единый проект

## Цель

Собрать всё в одном проекте `dubai-control/`:
- Маркетинговый сайт платформы (перенос из Lovable)
- Лендинги продуктов (CleanProof уже есть, MaintainProof добавить, 2 заглушки)
- Pricing, Legal pages, Contact
- Login/Signup (редизайн на Proof Platform)
- Приложение (уже работает, не трогать)

---

## Структура роутов

```
МАРКЕТИНГ (публичные, без auth)
├── /                           → Главная платформы (из Lovable)
├── /products                   → Обзор 4 продуктов (из Lovable)
├── /products/cleaning          → Лендинг CleanProof (переместить из /cleanproof)
├── /products/maintenance       → Лендинг MaintainProof (новый, из GitHub)
├── /products/property          → Coming Soon — PropertyProof
├── /products/fitout            → Coming Soon — FitoutProof
├── /pricing                    → Pricing (новый)
├── /contact                    → Contact / Demo request (новый)
├── /terms                      → Terms of Service (новый)
├── /privacy                    → Privacy Policy (новый)
├── /refund                     → Refund Policy (новый)
├── /updates                    → Product Updates (опционально)
├── /principles                 → Platform Principles (опционально)

AUTH (публичные, без auth)
├── /login                      → Sign in / Create account (редизайн)

ПРИЛОЖЕНИЕ (protected, после auth)
├── /dashboard                  → Dashboard
├── /jobs                       → Jobs (CleanProof context)
├── /maintenance/visits         → Visits (MaintainProof context)
├── /planning                   → Job Planning
├── /analytics                  → Analytics
├── /reports                    → Reports
├── /settings                   → Settings
├── /company                    → Company
└── ...остальные роуты приложения (не менять)

LEGACY REDIRECTS
├── /cleanproof                 → redirect → /products/cleaning
├── /cleanproof/pricing         → redirect → /pricing
├── /cleanproof/demo            → redirect → /contact
├── /maintainproof              → redirect → /products/maintenance
```

---

## Layout система

### MarketingLayout (новый)
Общий layout для всех маркетинговых страниц:

**Header:**
```
[Proof Platform logo]    Platform  Products  Pricing  Contact    [Sign in]  [Get Started →]
```

- Logo: "Proof Platform" (bold) — ссылка на /
- Products: dropdown или ссылка на /products
- Sign in → /login
- Get Started → /login?trial=starter
- Стиль: тёмный фон, фиксированный, backdrop-blur
- Акцент: orange (#E97A1F) как в Lovable сайте

**Footer:**
```
PLATFORM              PRODUCTS                    LEGAL
About                 Commercial Cleaning         Terms of Service
Pricing               Maintenance Services        Privacy Policy
Contact               Property Management ⌛       Refund Policy
Updates               Site Visits & Fit-out ⌛

© 2026 Proof Platform. All rights reserved.
support@proofplatform.app
```

### AppLayout (существующий)
Не менять. Sidebar + main content.

### LegalLayout (новый)
Для /terms, /privacy, /refund:
- Header: лого + "← Back"
- Контент: max-width 720px, чистая типографика
- Footer: мини (legal links + copyright)

---

## Порядок выполнения (4 фазы)

### ФАЗА 1 — Фундамент (layout + legal + auth)

**1.1 MarketingLayout**
- Создать `src/layouts/MarketingLayout.tsx`
- Header с навигацией (как в Lovable)
- Footer с legal links
- Тёмная тема для маркетинговых страниц

**1.2 Legal Pages**
- `/terms` — из terms-of-service.md
- `/privacy` — из privacy-policy.md
- `/refund` — из refund-policy.md
- Использовать LegalLayout

**1.3 Auth Redesign**
- `/login` — Proof Platform branding
- Sign in / Create account табы
- Задание: docs/tasks/TASK_AUTH_REDESIGN.md

### ФАЗА 2 — Главная + Products Hub

**2.1 Главная страница (`/`)**
Перенести из Lovable. Секции:

1. Hero: "Verified Proof of Service. Delivered at Scale."
   - Фоновое фото (рабочий в каске с планшетом)
   - Badge: "ENTERPRISE OPERATIONS PLATFORM"
   - CTA: "Explore Products →" и "Contact Sales"

2. Product Surfaces: "One Platform. Purpose-Built Configurations."
   - 4 карточки с кратким описанием каждого контекста
   - "Learn more →" ведёт на /products/cleaning и т.д.

3. Proof Engine: как работает платформа (GPS → Photos → Checklists → Reports)

4. Trust / Security section

5. CTA: "Get Started" → /login

**2.2 Products page (`/products`)**
Перенести из Lovable. Показывает все 4 контекста подробнее:

- Commercial Cleaning (OPERATIONS)
  - Features: GPS check-in, cleaning checklists, before/after photos, PDF reports
  - "Learn more →" → /products/cleaning
  
- Property Management (REAL ESTATE)
  - Features: inspection templates, condition documentation, GPS visits, historical records
  - "Learn more →" → /products/property
  
- Maintenance Services (FACILITIES)
  - Features: verification checklists, GPS time on site, before/after state, PDF reports
  - "Learn more →" → /products/maintenance
  
- Site Visits & Fit-out (CONSTRUCTION)
  - Features: on-site documentation, progress photos, visit checklists, verified records
  - "Learn more →" → /products/fitout

### ФАЗА 3 — Лендинги продуктов

**3.1 CleanProof Landing (`/products/cleaning`)**
- Переместить существующий /cleanproof лендинг сюда
- Обернуть в MarketingLayout (единый header/footer)
- Добавить badge: "Part of Proof Platform — included in every plan"
- /cleanproof → redirect на /products/cleaning

**3.2 MaintainProof Landing (`/products/maintenance`)**
- Добавить лендинг из GitHub (WorkOrders)
- Переименовать: WorkOrders → MaintainProof
- Accent: зелёный #059669
- Обернуть в MarketingLayout
- Badge: "Part of Proof Platform — included in every plan"

**3.3 PropertyProof Coming Soon (`/products/property`)**
- Заглушка: "Coming Q4 2026"
- Описание из context_property.md
- Planned features с lock-иконками
- "Notify me" email input
- Accent: violet #7C3AED (приглушённый)

**3.4 FitoutProof Coming Soon (`/products/fitout`)**
- Заглушка: "Coming Q3 2026"
- Описание из context_fitout.md
- Planned features с lock-иконками
- "Notify me" email input
- Accent: amber #D97706 (приглушённый)

### ФАЗА 4 — Pricing + Contact

**4.1 Pricing (`/pricing`)**
- Новая страница в MarketingLayout
- Headline: "One platform. All operations. Choose your scale."
- Badge: "✓ All contexts included in every plan"
- Toggle: Monthly / Annual (save 15%)
- 3 карточки: Starter $129 / Professional $279 / Business $499
- Enterprise: "Contact sales"
- FAQ секция
- /cleanproof/pricing → redirect на /pricing

**4.2 Contact (`/contact`)**
- Форма: Name, Company, Email, Subject (dropdown), Message
- Справа: email, описание
- /cleanproof/demo → redirect на /contact

---

## Визуальная система маркетинга

Стиль — как в текущем Lovable сайте:

| Элемент | Значение |
|---------|----------|
| Background | Dark: hsl(220, 20%, 10%) — основной фон |
| Card background | hsl(220, 18%, 14%) — карточки |
| Card border | rgba(255,255,255, 0.08) |
| Accent (platform) | #E97A1F (orange, как в Lovable) |
| Accent Cleaning | #2563EB (blue) |
| Accent Maintenance | #059669 (green) |
| Accent Property | #7C3AED (violet) |
| Accent Fit-out | #D97706 (amber) |
| Text primary | #FFFFFF |
| Text secondary | rgba(255,255,255, 0.6) |
| Text muted | rgba(255,255,255, 0.35) |
| Font | Inter (или шрифт из Lovable) |
| Hero photos | Реальные фото из UAE (рабочие, здания) |

---

## Источники контента

| Страница | Источник |
|----------|----------|
| Главная (/) | Lovable — перенести код |
| Products (/products) | Lovable — перенести код |
| CleanProof landing | Уже в dubai-control (/cleanproof) |
| MaintainProof landing | GitHub (WorkOrders repo) |
| PropertyProof (coming soon) | Новая, контент из context_property.md |
| FitoutProof (coming soon) | Новая, контент из context_fitout.md |
| Pricing | Новая, контент из PRICING_STRATEGY.md |
| Terms | Новая, контент из terms-of-service.md |
| Privacy | Новая, контент из privacy-policy.md |
| Refund | Новая, контент из refund-policy.md |
| Contact | Новая |
| Login | Редизайн, референс proof-auth-light.jsx |

---

## Файловая структура (в dubai-control)

```
src/
├── layouts/
│   ├── MarketingLayout.tsx          ← НОВЫЙ (header + footer для маркетинга)
│   ├── LegalLayout.tsx              ← НОВЫЙ (для terms/privacy/refund)
│   └── AppLayout.tsx                ← существующий (не менять)
│
├── pages/
│   ├── marketing/
│   │   ├── HomePage.tsx             ← НОВЫЙ (главная платформы)
│   │   ├── ProductsPage.tsx         ← НОВЫЙ (обзор 4 продуктов)
│   │   ├── PricingPage.tsx          ← НОВЫЙ
│   │   └── ContactPage.tsx          ← НОВЫЙ
│   │
│   ├── products/
│   │   ├── CleanProofLanding.tsx    ← переместить из landing/
│   │   ├── MaintainProofLanding.tsx ← НОВЫЙ (из GitHub)
│   │   ├── PropertyProofComing.tsx  ← НОВЫЙ (coming soon)
│   │   └── FitoutProofComing.tsx    ← НОВЫЙ (coming soon)
│   │
│   ├── legal/
│   │   ├── TermsOfService.tsx       ← НОВЫЙ
│   │   ├── PrivacyPolicy.tsx        ← НОВЫЙ
│   │   └── RefundPolicy.tsx         ← НОВЫЙ
│   │
│   ├── auth/
│   │   └── LoginPage.tsx            ← редизайн
│   │
│   └── ... (существующие app pages — не менять)
```

---

## Что НЕ менять

- Backend — вообще не трогать
- Приложение (dashboard, jobs, maintenance, reports, analytics, settings)
- API вызовы и auth логика
- Существующие app layouts и компоненты
- Mobile app

---

## Чеклист

### Фаза 1
- [ ] MarketingLayout с header и footer
- [ ] /terms загружается
- [ ] /privacy загружается
- [ ] /refund загружается
- [ ] /login — Proof Platform branding

### Фаза 2
- [ ] / — главная платформы (перенос из Lovable)
- [ ] /products — обзор 4 продуктов (перенос из Lovable)

### Фаза 3
- [ ] /products/cleaning — CleanProof лендинг (перемещён из /cleanproof)
- [ ] /products/maintenance — MaintainProof лендинг (из GitHub)
- [ ] /products/property — Coming Soon
- [ ] /products/fitout — Coming Soon
- [ ] /cleanproof → redirect → /products/cleaning
- [ ] /cleanproof/pricing → redirect → /pricing

### Фаза 4
- [ ] /pricing — платформенный (Starter/Professional/Business)
- [ ] /contact — форма
- [ ] Все маркетинговые страницы в MarketingLayout
- [ ] Все CTA ведут на /login
- [ ] npm run build проходит
- [ ] Визуально согласовано (тёмная тема маркетинг, светлая приложение)
