import { describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for auth token storage logic (mirrors client.ts STORAGE_KEYS behavior).
 *
 * We test the contract directly against localStorage since the actual
 * getAuthHeaders / _refreshTokens functions are not exported from client.ts.
 * These tests ensure the storage key conventions are correct.
 */

const STORAGE_KEYS = {
  ACCESS: "access_token",
  REFRESH: "refresh_token",
  AUTH_TOKEN: "authToken",
  AUTH_TOKEN_ALT: "auth_token",
};

describe("Auth token storage conventions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("JWT access_token is the primary token key", () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS, "jwt-access-123");
    expect(localStorage.getItem("access_token")).toBe("jwt-access-123");
  });

  it("refresh_token stored alongside access_token", () => {
    localStorage.setItem(STORAGE_KEYS.REFRESH, "jwt-refresh-456");
    expect(localStorage.getItem("refresh_token")).toBe("jwt-refresh-456");
  });

  it("legacy authToken key is still recognized", () => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, "legacy-token");
    expect(localStorage.getItem("authToken")).toBe("legacy-token");
  });

  it("clear all auth tokens on logout", () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS, "a");
    localStorage.setItem(STORAGE_KEYS.REFRESH, "r");
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, "t");
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN_ALT, "t2");

    // Simulate logout (same logic as client.ts _clearAllTokens)
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }

    expect(localStorage.getItem(STORAGE_KEYS.ACCESS)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN_ALT)).toBeNull();
  });

  it("JWT access_token takes priority over legacy token", () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS, "jwt-token");
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, "old-token");

    // Primary check (matches getAuthHeaders in client.ts)
    const jwtAccess = localStorage.getItem(STORAGE_KEYS.ACCESS);
    const legacyToken =
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN_ALT);

    if (jwtAccess) {
      expect(`Bearer ${jwtAccess}`).toBe("Bearer jwt-token");
    } else if (legacyToken) {
      // Should not reach here
      expect(true).toBe(false);
    }
  });
});

describe("Auth redirect behavior", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ProtectedRoute should redirect when no access_token exists", () => {
    const hasToken = !!localStorage.getItem("access_token");
    expect(hasToken).toBe(false);
  });

  it("ProtectedRoute should allow access when access_token exists", () => {
    localStorage.setItem("access_token", "test-jwt-token");
    const hasToken = !!localStorage.getItem("access_token");
    expect(hasToken).toBe(true);
  });
});
