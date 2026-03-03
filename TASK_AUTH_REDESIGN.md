# TASK: Редизайн Auth Pages — "Proof Platform" Ребрендинг

## Контекст

Proof Platform — мульти-контекстная SaaS платформа с двумя продуктами:
- **CleanProof** (клининг, акцент — синий #2563EB)
- **MaintainProof** (обслуживание, акцент — зелёный #059669)

Фронтенд: `dubai-control/` — React + TypeScript + Vite, Tailwind, shadcn/ui.

Сейчас страницы Login (`/`) и Signup (`/signup`) брендированы как "CleanProof" с упоминанием cleaning. Нужно ребрендить на **"Proof Platform"** — нейтральный вход в платформу без привязки к конкретному продукту.

---

## Что нужно сделать

### 1. Страница Login (`/`) — полный редизайн

**Текущее состояние:**
- Лого "SC CleanProof" слева
- Заголовок "Welcome back" / "Sign in to manage your cleaning operations"
- Простая форма: Email + Password + кнопка Sign in
- Ссылка "Don't have an account? Sign up"
- Текст "Trusted by cleaning professionals across the UAE"
- Правая панель: иконка SC + "Proof of work you can trust" + описание

**Новое состояние — Split layout (два блока):**

#### Левый блок (форма):
- **Лого:** Иконка щита с галочкой (SVG, gradient blue→violet) + текст "Proof" (bold) + "Platform" (light)
- **Табы:** "Sign in" / "Create account" — переключение между login и signup **на одной странице** (без отдельного роута /signup, но можно оставить /signup как redirect)
- **Sign in форма:**
  - Подзаголовок: "Welcome back. Sign in to your workspace."
  - Email input с иконкой Mail слева
  - Password input с иконкой Lock слева + show/hide toggle справа
  - "Forgot password?" ссылка справа под паролем
  - Кнопка "Sign in →" (gradient blue, hover с тенью)
- **Create account форма:**
  - Подзаголовок: "Start your 7-day free trial. No credit card required."
  - Company name (иконка Building)
  - Your name (иконка User)
  - Work email (иконка Mail)
  - Password (иконка Lock + show/hide)
  - Confirm password (иконка Lock + show/hide)
  - Кнопка "Create account →"
  - Текст "By creating an account you agree to our Terms and Privacy Policy"
- **Анимация:** плавная смена форм при переключении табов (fadeSlide)
- **Валидация и error messages:** сохранить текущую логику, но обновить стиль (красный бейдж)

#### Правый блок (платформенный шоукейс):
- **Бейдж:** "● Operational proof platform" (синий)
- **Заголовок:** "If it's not proven," / "it didn't happen." (вторая строка — синий цвет)
- **Подзаголовок:** "Every job verified. Every report audit-ready. Full operational transparency for service teams."
- **4 карточки Proof Chain** (с hover эффектом translateX):
  - GPS Verification (иконка MapPin, фон blueLight) — "Confirm presence at every location"
  - Photo Evidence (иконка Camera, фон greenLight) — "Timestamped before & after documentation"
  - Smart Checklists (иконка Clipboard, фон violetLight) — "Track every task with SLA compliance"
  - PDF Reports (иконка FileText, фон accentLight) — "Client-ready reports generated instantly"
- **Футер правого блока:** Строка "Products:" + бейджи "CleanProof" (синий) и "MaintainProof" (зелёный)
- **Фон:** gradient от light blue к light violet (`linear-gradient(160deg, #F8FAFF 0%, #F0F4FF 40%, #F5F0FF 100%)`)
- **Декоративные элементы:** два круга с radial-gradient (верх-право, низ-лево)

#### Общее:
- **Фон страницы:** #F8F9FB (как внутренний интерфейс)
- **Карточка:** белая с border #E2E4E9, border-radius 20px, box-shadow мягкий
- **Footer:** "© 2026 Proof Platform · Privacy · Terms" внизу экрана
- **Адаптив:** на мобильных (<960px) правый блок скрывается, левый занимает 100%
- **Шрифт:** Inter (уже используется в проекте)

---

### 2. Страница Signup (`/signup`)

Варианты реализации (выбрать один):
- **Вариант A (рекомендуемый):** Убрать отдельный роут `/signup`. Login page с табами уже содержит Create account. Роут `/signup` делает redirect на `/` с query param `?mode=signup` или просто на `/`.
- **Вариант B:** Оставить `/signup` как отдельную страницу, но с тем же дизайном (Proof Platform, правый блок, тот же стиль формы).

---

### 3. Что НЕ менять

- API endpoints (POST /api/auth/login/, POST /api/auth/signup/) — без изменений
- Логику авторизации, хранение токенов, redirect после логина
- Роутинг внутри приложения после логина (dashboard, context switch CleanProof/MaintainProof)
- Backend — вообще не трогать

---

### 4. Тексты которые нужно убрать/заменить

| Было | Стало |
|------|-------|
| "CleanProof" (на login) | "Proof Platform" |
| "SC" (иконка) | Иконка щита с галочкой (SVG) |
| "Welcome back" | "Welcome back. Sign in to your workspace." |
| "Sign in to manage your cleaning operations" | убрать |
| "Trusted by cleaning professionals across the UAE" | убрать |
| "Proof of work you can trust" (правая панель) | "If it's not proven, it didn't happen." |
| "GPS verification, timestamped photos..." | 4 отдельных карточки (см. выше) |
| "Create your CleanProof account" (signup) | Таб "Create account" в форме |

---

### 5. Цветовая палитра

```
Фон страницы:     #F8F9FB
Карточка:          #FFFFFF
Surface input:     #F4F5F7
Border:            #E2E4E9
Border focus:      accent color
Accent (основной): #2563EB
Accent hover:      #1D4FD7
Text primary:      #111318
Text secondary:    #4B5161
Text muted:        #6C7281
Text dim:          #9CA3B0
Error:             #DC2626
Error bg:          #FEF2F2

Правый блок:
Blue light bg:     #EFF4FF
Green light bg:    #ECFDF5
Violet light bg:   #F5F3FF
Violet accent:     #7C3AED
Green accent:      #059669
```

---

### 6. SVG иконка логотипа (Proof Platform)

Щит с галочкой, gradient fill blue→violet:

```jsx
<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" 
    fill="url(#logo_g)" fillOpacity="0.12" stroke="url(#logo_g)" strokeWidth="1.5" strokeLinejoin="round"/>
  <path d="M9 12l2 2 4-4" stroke="url(#logo_g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <defs><linearGradient id="logo_g" x1="4" y1="2" x2="20" y2="22">
    <stop stopColor="#2563EB"/><stop offset="1" stopColor="#7C3AED"/>
  </linearGradient></defs>
</svg>
```

---

### 7. Референс-код

Полный рабочий React-компонент с финальным дизайном приложен к проекту:
`proof-auth-light.jsx`

Этот файл — **визуальный референс**. Не копировать 1:1, а адаптировать:
- Использовать существующие утилиты проекта (Tailwind классы, cn(), shadcn компоненты где уместно)
- Сохранить существующую логику API-вызовов из текущих Login/Signup компонентов
- Иконки: можно использовать lucide-react (уже в проекте) вместо inline SVG
- Input компонент: можно на базе shadcn Input, добавив иконки

---

### 8. Чеклист перед завершением

- [ ] Login page отображает "Proof Platform" (не CleanProof)
- [ ] Нет упоминаний "cleaning" / "cleaning operations" / "cleaning professionals"
- [ ] Sign in форма работает (API вызов не изменён)
- [ ] Sign up форма работает (API вызов не изменён)
- [ ] Табы Sign in / Create account переключаются плавно
- [ ] Правый блок показывает proof chain + продукты (CleanProof + MaintainProof)
- [ ] Адаптив: правый блок скрывается на мобильных
- [ ] Error states работают (неверный пароль, пустые поля)
- [ ] Redirect после успешного логина работает как раньше
- [ ] "Forgot password?" ссылка присутствует
- [ ] Password show/hide toggle работает
- [ ] Focus states на инпутах с цветным бордером
- [ ] `npm run build` проходит без ошибок
- [ ] Визуально стыкуется со светлым интерфейсом дашборда
