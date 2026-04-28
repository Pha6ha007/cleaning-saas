# TICKET-005 — Create frontend production env example + fix silent fallback URLs

## Контекст

В `dubai-control/` существует только `.env.staging.example`, нет `.env.production.example`. При этом несколько файлов содержат опасный fallback:

```typescript
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";
```

Файлы с таким fallback (найдены grep-ом):
- `dubai-control/src/api/core.ts`
- `dubai-control/src/api/support.ts`
- `dubai-control/src/hooks/usePageTracking.ts`
- `dubai-control/src/pages/Reports.tsx`
- `dubai-control/src/pages/ResetPassword.tsx`
- `dubai-control/src/pages/platform/Contact.tsx`

Дополнительно: порт **8001** в fallback, но реально backend в проекте слушает **8000** — то есть fallback ещё и неверный. Если кто-то соберёт production build без `VITE_API_BASE_URL`, фронт будет тихо стучаться в `127.0.0.1:8001` и ничего не получать.

## Что делаем

### 1. Создать `dubai-control/.env.production.example`

```bash
# =============================================================================
# Proof Platform — Frontend Production Environment Variables
# =============================================================================
# Copy to .env.production on the build host (Vercel / Netlify / your CI).
# All variables prefixed with VITE_ are inlined into the bundle at build time.
# DO NOT put secrets here — frontend env is public after build.
# =============================================================================

# --- API Backend ---
# Required. The base URL of the backend API. No trailing slash.
# Example: https://api.proofplatform.com
VITE_API_BASE_URL=https://api.proofplatform.com

# --- Sentry (error monitoring) ---
# Optional but strongly recommended. Public DSN — safe to ship in bundle.
VITE_SENTRY_DSN=

# Sentry environment tag. One of: production, staging, development.
VITE_SENTRY_ENVIRONMENT=production

# --- Paddle (billing) ---
# Required if billing is enabled. Public client-side token from Paddle dashboard.
VITE_PADDLE_CLIENT_TOKEN=
# One of: sandbox, production
VITE_PADDLE_ENVIRONMENT=production

# --- Google Maps ---
# Required for the Map view in MaintainProof. Public, but lock by HTTP referrer
# in the Google Cloud Console.
VITE_GOOGLE_MAPS_API_KEY=

# --- App metadata ---
VITE_APP_VERSION=1.0.0
```

### 2. Создать helper и убрать fallback

Создать новый файл `dubai-control/src/lib/env.ts`:

```typescript
// Centralised env access. Single source of truth for env-driven config.
// Fail loudly in production if required vars are missing — silent localhost
// fallback is a foot-gun in production builds.

function required(name: string, value: string | undefined): string {
  if (!value) {
    const msg = `[env] Missing required environment variable: ${name}`;
    if (import.meta.env.PROD) {
      // In production, throw immediately at module load — visible in Sentry.
      throw new Error(msg);
    }
    // In dev, warn but allow localhost fallback for ergonomics.
    console.warn(msg);
  }
  return value ?? "";
}

function optional(name: string, value: string | undefined, fallback = ""): string {
  return value ?? fallback;
}

const isProd = import.meta.env.PROD;
const devApiFallback = "http://127.0.0.1:8000"; // ← note: 8000, not 8001

export const env = {
  apiBaseUrl: isProd
    ? required("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL)
    : optional("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL, devApiFallback),

  sentryDsn: optional("VITE_SENTRY_DSN", import.meta.env.VITE_SENTRY_DSN),
  sentryEnvironment: optional(
    "VITE_SENTRY_ENVIRONMENT",
    import.meta.env.VITE_SENTRY_ENVIRONMENT,
    isProd ? "production" : "development",
  ),

  paddleClientToken: optional(
    "VITE_PADDLE_CLIENT_TOKEN",
    import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
  ),
  paddleEnvironment: optional(
    "VITE_PADDLE_ENVIRONMENT",
    import.meta.env.VITE_PADDLE_ENVIRONMENT,
    "sandbox",
  ),

  googleMapsApiKey: optional(
    "VITE_GOOGLE_MAPS_API_KEY",
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  ),

  appVersion: optional("VITE_APP_VERSION", import.meta.env.VITE_APP_VERSION, "0.0.0"),

  isProd,
  isDev: !isProd,
} as const;
```

### 3. Заменить fallback во всех 6 файлах

В каждом из этих файлов:
- `dubai-control/src/api/core.ts`
- `dubai-control/src/api/support.ts`
- `dubai-control/src/hooks/usePageTracking.ts`
- `dubai-control/src/pages/Reports.tsx`
- `dubai-control/src/pages/ResetPassword.tsx`
- `dubai-control/src/pages/platform/Contact.tsx`

заменить старое:
```typescript
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";
```

на:
```typescript
import { env } from "@/lib/env";
const API_BASE_URL = env.apiBaseUrl;
```

(Если файл уже использует `import.meta.env.VITE_*` для других переменных — заменить только `VITE_API_BASE_URL` строку. Не переписывать весь файл.)

В `Reports.tsx` есть inline объявление — заменить так же.

## Файлы которые можно трогать

- `dubai-control/.env.production.example` (создать)
- `dubai-control/src/lib/env.ts` (создать)
- 6 файлов выше — точечная замена строки

## Anti-scope (не трогать)

- НЕ удалять `.env.staging.example` — оставить как есть
- НЕ добавлять секреты в `.env.production.example` (там не должно быть никаких real values)
- НЕ менять логику fetch-ей в файлах, только источник `API_BASE_URL`
- НЕ добавлять новые env vars которых нет в требованиях этого тикета
- НЕ трогать `vercel.json`

## Тест который надо добавить

Создать `dubai-control/src/lib/__tests__/env.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("env helper", () => {
  // Note: import.meta.env is replaced at compile time by Vite, so testing the
  // production-throw behaviour requires a separate build. Here we test that:
  // 1. env module exports the expected shape
  // 2. apiBaseUrl resolves to a non-empty string in test mode (dev fallback)
  it("exports apiBaseUrl as non-empty string in dev/test mode", async () => {
    const { env } = await import("../env");
    expect(typeof env.apiBaseUrl).toBe("string");
    expect(env.apiBaseUrl.length).toBeGreaterThan(0);
  });

  it("exports all expected fields", async () => {
    const { env } = await import("../env");
    expect(env).toHaveProperty("apiBaseUrl");
    expect(env).toHaveProperty("sentryDsn");
    expect(env).toHaveProperty("sentryEnvironment");
    expect(env).toHaveProperty("paddleClientToken");
    expect(env).toHaveProperty("paddleEnvironment");
    expect(env).toHaveProperty("googleMapsApiKey");
    expect(env).toHaveProperty("isProd");
    expect(env).toHaveProperty("isDev");
  });

  it("dev fallback uses port 8000 not 8001", async () => {
    const { env } = await import("../env");
    // In test mode (which is treated as dev), if VITE_API_BASE_URL is unset,
    // we should fall back to port 8000 (matches backend default).
    if (!import.meta.env.VITE_API_BASE_URL) {
      expect(env.apiBaseUrl).toContain(":8000");
      expect(env.apiBaseUrl).not.toContain(":8001");
    }
  });
});
```

## Definition of Done

- [ ] `.env.production.example` создан
- [ ] `src/lib/env.ts` создан
- [ ] Во всех 6 файлах fallback заменён на импорт из `env.ts`
- [ ] `npx tsc --noEmit` проходит без ошибок
- [ ] `npm run test` проходит (vitest)
- [ ] grep `127.0.0.1:8001` по `dubai-control/src/` ничего не возвращает
- [ ] grep `127.0.0.1:8000` по `dubai-control/src/` показывает только `src/lib/env.ts` (одно вхождение в dev fallback)

## Команды верификации

```bash
cd dubai-control
npx tsc --noEmit
npm run test -- --run

# Проверка что старый fallback вычищен
grep -rn "127.0.0.1:8001" src/ && echo "FOUND OLD FALLBACK" || echo "OK clean"
grep -rn "127.0.0.1:8000" src/
```

Жду:
- output `tsc --noEmit` (если без ошибок — пусто, тогда `echo $?` должен быть `0`)
- output `npm run test`
- output двух grep команд

## Размер изменений (ожидается)

- 1 новый файл `.env.production.example` (~30 строк)
- 1 новый файл `src/lib/env.ts` (~50 строк)
- 1 новый тест-файл (~30 строк)
- 6 точечных правок (по 2–3 строки каждая)

## Важное замечание

Алиас `@/` уже настроен в проекте (Vite + tsconfig paths). Если по какой-то причине импорт `@/lib/env` не резолвится — использовать относительный путь `../lib/env` или `../../lib/env` в зависимости от файла. **Не настраивать алиасы заново**.
