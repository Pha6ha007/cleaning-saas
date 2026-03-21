/**
 * e2e/smoke.spec.ts — Smoke tests for every major route group.
 *
 * These tests verify that pages load without crashing (no white-screen,
 * no uncaught JS errors). They do NOT need a running backend — the app
 * renders its shell/loading states client-side.
 *
 * Each test is independent and fast (< 4s per page).
 */

import { test, expect, Page } from "@playwright/test";

// ── Helpers ─────────────────────────────────────────────────────────

/** Collect console errors during a test */
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore expected noise (network errors without backend, React dev warnings)
      if (
        text.includes("net::ERR_") ||
        text.includes("Failed to fetch") ||
        text.includes("NetworkError") ||
        text.includes("Load failed") ||
        text.includes("ERR_CONNECTION_REFUSED") ||
        text.includes("AxiosError") ||
        text.includes("401") ||
        text.includes("403") ||
        text.includes("404 (Not Found)") ||
        text.includes("download the React DevTools") ||
        // App intentionally logs 404 route attempts
        text.includes("404 Error: User attempted to access")
      ) {
        return;
      }
      errors.push(text);
    }
  });
  return errors;
}

/**
 * Navigate and assert the page renders (not a blank white screen).
 * Returns collected console errors for further assertion.
 */
async function loadPage(page: Page, path: string) {
  const errors = collectConsoleErrors(page);
  await page.goto(path, { waitUntil: "networkidle" });
  // Page must have meaningful content (not blank)
  await expect(page.locator("body")).not.toBeEmpty();
  return errors;
}

/**
 * Inject fake auth tokens into localStorage so protected pages render.
 * This avoids needing a real backend.
 */
async function injectAuth(page: Page) {
  await page.goto("/login", { waitUntil: "commit" });
  await page.evaluate(() => {
    localStorage.setItem("access_token", "fake-jwt-for-e2e");
    localStorage.setItem("refresh_token", "fake-refresh-for-e2e");
    localStorage.setItem("authUserRole", "manager");
    localStorage.setItem("authUserEmail", "e2e@test.com");
  });
}

// ── Public / Marketing Pages ────────────────────────────────────────

test.describe("Public pages", () => {
  const publicRoutes = [
    ["/", "Platform landing"],
    ["/products", "Products"],
    ["/products/cleaning", "Cleaning product"],
    ["/products/maintenance", "Maintenance product"],
    ["/products/property", "Property (coming soon)"],
    ["/products/fitout", "Fitout (coming soon)"],
    ["/contact", "Contact"],
    ["/updates", "Updates"],
    ["/principles", "Principles"],
    ["/pricing", "Pricing"],
    ["/terms", "Terms of Service"],
    ["/privacy", "Privacy Policy"],
    ["/refund", "Refund Policy"],
    ["/login", "Login"],
    ["/signup", "Signup"],
  ] as const;

  for (const [path, name] of publicRoutes) {
    test(`${name} (${path}) loads without errors`, async ({ page }) => {
      const errors = await loadPage(page, path);
      expect(errors, `Console errors on ${path}`).toEqual([]);
    });
  }
});

// ── Legacy Redirects ────────────────────────────────────────────────

test.describe("Legacy redirects", () => {
  const redirects = [
    ["/cleanproof", "/products/cleaning"],
    ["/cleanproof/pricing", "/pricing"],
    ["/cleanproof/demo", "/contact"],
    ["/cleanproof/updates", "/updates"],
    ["/cleanproof/contact", "/contact"],
  ] as const;

  for (const [from, to] of redirects) {
    test(`${from} → ${to}`, async ({ page }) => {
      await page.goto(from, { waitUntil: "networkidle" });
      expect(page.url()).toContain(to);
    });
  }
});

// ── 404 Catch-all ───────────────────────────────────────────────────

test("Unknown route shows 404 page", async ({ page }) => {
  const errors = await loadPage(page, "/this-does-not-exist-xyz");
  // Should show 404 UI, not a blank page
  const body = await page.textContent("body");
  expect(body).toMatch(/not found|404|doesn.*exist/i);
  expect(errors).toEqual([]);
});

// ── Protected Pages (with fake auth) ────────────────────────────────

test.describe("Protected pages (CleanProof)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  const protectedRoutes = [
    ["/dashboard", "Dashboard"],
    ["/jobs", "Jobs"],
    ["/planning", "Job Planning"],
    ["/history", "History"],
    ["/performance", "Performance"],
    ["/reports", "Reports"],
    ["/analytics", "Analytics"],
    ["/locations", "Locations"],
    ["/docs", "Docs"],
    ["/support", "Support"],
    ["/settings", "Settings"],
    ["/settings/account", "Account Settings"],
    ["/settings/billing", "Billing"],
    ["/company/profile", "Company Profile"],
    ["/company/team", "Company Team"],
    ["/branches", "Branches"],
    ["/scheduling", "Scheduling"],
    ["/audit-log", "Audit Log"],
  ] as const;

  for (const [path, name] of protectedRoutes) {
    test(`${name} (${path}) renders shell`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(path, { waitUntil: "networkidle" });
      // Page renders app layout (sidebar + content area)
      await expect(page.locator("body")).not.toBeEmpty();
      expect(errors, `Console errors on ${path}`).toEqual([]);
    });
  }
});

test.describe("Protected pages (MaintainProof)", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  const maintenanceRoutes = [
    ["/maintenance/dashboard", "Maintenance Dashboard"],
    ["/maintenance/visits", "Visit List"],
    ["/maintenance/visits/new", "Create Visit"],
    ["/maintenance/assets", "Assets"],
    ["/maintenance/asset-types", "Asset Types"],
    ["/maintenance/technicians", "Technicians"],
    ["/maintenance/calendar", "Calendar"],
    ["/maintenance/schedules", "Recurring Schedules"],
    ["/maintenance/contracts", "Contracts"],
    ["/maintenance/locations", "Maintenance Locations"],
    ["/maintenance/checklists", "Checklists"],
    ["/maintenance/parts", "Parts"],
    ["/maintenance/map", "Map"],
    ["/maintenance/company", "Company"],
    ["/maintenance/analytics", "Maintenance Analytics"],
    ["/maintenance/reports", "Maintenance Reports"],
    ["/maintenance/docs", "Maintenance Docs"],
    ["/maintenance/support", "Maintenance Support"],
  ] as const;

  for (const [path, name] of maintenanceRoutes) {
    test(`${name} (${path}) renders shell`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("body")).not.toBeEmpty();
      expect(errors, `Console errors on ${path}`).toEqual([]);
    });
  }
});

// ── Cleaner Interface ───────────────────────────────────────────────

test("Cleaner page (/cleaner) loads", async ({ page }) => {
  const errors = await loadPage(page, "/cleaner");
  expect(errors).toEqual([]);
});

// ── Critical User Path ──────────────────────────────────────────────

test.describe("Critical auth flow", () => {
  test("Login form is functional", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    // Login form uses custom IconInput — find fields by placeholder
    const emailInput = page.getByPlaceholder("name@company.com").first();
    const passwordInput = page.getByPlaceholder("Enter your password");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Can type into fields
    await emailInput.fill("test@example.com");
    await passwordInput.fill("testpassword123");

    // Submit button should exist
    const submitBtn = page.locator("form").getByRole("button", { name: /sign in/i });
    await expect(submitBtn).toBeVisible();
  });

  test("Signup redirects to landing (tab on login)", async ({ page }) => {
    // /signup redirects to / (signup is a tab on the login page)
    await page.goto("/signup", { waitUntil: "networkidle" });
    // Should end up on landing page (/ redirect)
    const url = page.url();
    expect(url.endsWith("/") || url.includes("/login")).toBeTruthy();
  });

  test("Protected route redirects or shows auth prompt without token", async ({
    page,
  }) => {
    // Clear any stored tokens
    await page.goto("/login", { waitUntil: "commit" });
    await page.evaluate(() => localStorage.clear());

    // Visit a protected route
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Should either:
    // 1. Redirect to /login
    // 2. Show the page shell (API calls fail gracefully)
    const url = page.url();
    const body = await page.textContent("body");
    const isOnLogin = url.includes("/login");
    const hasContent = body && body.trim().length > 50;
    expect(isOnLogin || hasContent).toBeTruthy();
  });

  test("Fake-auth dashboard shows layout chrome", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // App layout should render — sidebar nav is visible
    // Look for navigation links that indicate the shell rendered
    const nav = page.locator("nav, [role=navigation], aside").first();
    await expect(nav).toBeVisible({ timeout: 5000 });
  });
});
