import { describe, it, expect } from "vitest";
import { maintenanceKeys } from "@/api/maintenance";

/**
 * Tests for maintenance query keys.
 *
 * React Query v4+ requires all queryKey values to be arrays.
 * Bug #8 (fixed) was caused by passing maintenanceKeys.checklistTemplates
 * (an object) instead of maintenanceKeys.checklistTemplates.all (an array).
 *
 * These tests ensure all query key entries produce arrays, preventing regression.
 */

describe("maintenanceKeys — all keys are arrays", () => {
  // Top-level namespace keys with .all pattern
  const namespacedKeys = [
    "categories",
    "assets",
    "assetTypes",
    "visits",
    "checklistTemplates",
    "analytics",
    "reports",
    "recurringTemplates",
    "contracts",
    "notifications",
    "parts",
    "visitParts",
  ] as const;

  for (const ns of namespacedKeys) {
    it(`maintenanceKeys.${ns}.all is an array`, () => {
      const entry = maintenanceKeys[ns];
      expect(entry).toBeDefined();
      expect(typeof entry).toBe("object");
      expect("all" in entry).toBe(true);
      expect(Array.isArray((entry as { all: unknown }).all)).toBe(true);
    });
  }

  // Plain array keys (not namespaced)
  it("maintenanceKeys.locations is an array", () => {
    expect(Array.isArray(maintenanceKeys.locations)).toBe(true);
  });

  it("maintenanceKeys.technicians is an array", () => {
    expect(Array.isArray(maintenanceKeys.technicians)).toBe(true);
  });
});

describe("maintenanceKeys — key factory functions return arrays", () => {
  it("categories.list() returns array", () => {
    expect(Array.isArray(maintenanceKeys.categories.list())).toBe(true);
  });

  it("categories.detail(1) returns array with id", () => {
    const key = maintenanceKeys.categories.detail(1);
    expect(Array.isArray(key)).toBe(true);
    expect(key).toContain(1);
  });

  it("visits.list() returns array", () => {
    expect(Array.isArray(maintenanceKeys.visits.list())).toBe(true);
  });

  it("visits.list with filters returns array", () => {
    const key = maintenanceKeys.visits.list({ status: "completed" });
    expect(Array.isArray(key)).toBe(true);
  });

  it("checklistTemplates.all is an array (not object)", () => {
    // This is the exact regression test for Bug #8
    const all = maintenanceKeys.checklistTemplates.all;
    expect(Array.isArray(all)).toBe(true);
    expect(all).toEqual(["maintenance", "checklistTemplates"]);
  });

  it("checklistTemplates.list() returns array", () => {
    expect(Array.isArray(maintenanceKeys.checklistTemplates.list())).toBe(true);
  });

  it("recurringTemplates.list() returns array", () => {
    expect(Array.isArray(maintenanceKeys.recurringTemplates.list())).toBe(true);
  });

  it("analytics.summary() returns array with range", () => {
    const range = { start: "2026-01-01", end: "2026-01-31" };
    const key = maintenanceKeys.analytics.summary(range);
    expect(Array.isArray(key)).toBe(true);
    expect(key).toContain("summary");
  });

  it("reports.weekly() returns array", () => {
    const key = maintenanceKeys.reports.weekly();
    expect(Array.isArray(key)).toBe(true);
    expect(key).toContain("weekly");
  });
});
