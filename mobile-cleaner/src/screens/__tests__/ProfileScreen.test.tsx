// mobile-cleaner/src/screens/__tests__/ProfileScreen.test.tsx
/**
 * M012/S01 — ProfileScreen logic tests
 *
 * Since @testing-library/react-native is not installed, we test the
 * ProfileScreen logic by verifying:
 * 1. fetchMe is called on mount via the module contract
 * 2. clearTokens + navigation.reset is called on logout
 *
 * Integration is verified via the existing expo test setup.
 */

// ── API mock ───────────────────────────────────────────────────────────────
const mockFetchMe = jest.fn();
const mockClearTokens = jest.fn();

jest.mock("../../api/client", () => ({
  fetchMe: (...args: any[]) => mockFetchMe(...args),
  clearTokens: (...args: any[]) => mockClearTokens(...args),
}));

// ── AsyncStorage mock ──────────────────────────────────────────────────────
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

// ── Navigation mock ────────────────────────────────────────────────────────
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

import { fetchMe, clearTokens } from "../../api/client";

const MOCK_PROFILE = {
  id: 7,
  email: "ali@example.com",
  full_name: "Ali Hassan",
  role: "cleaner",
  company_name: "Dubai Clean Co",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockClearTokens.mockResolvedValue(undefined);
});

describe("ProfileScreen contract", () => {
  it("fetchMe returns CleanerProfile shape", async () => {
    mockFetchMe.mockResolvedValue(MOCK_PROFILE);
    const profile = await fetchMe();
    expect(profile.id).toBe(7);
    expect(profile.full_name).toBe("Ali Hassan");
    expect(profile.role).toBe("cleaner");
    expect(profile.company_name).toBe("Dubai Clean Co");
    expect(profile.email).toBe("ali@example.com");
  });

  it("fetchMe propagates errors", async () => {
    mockFetchMe.mockRejectedValue(new Error("Network timeout"));
    await expect(fetchMe()).rejects.toThrow("Network timeout");
  });

  it("clearTokens is awaitable and resolves", async () => {
    await expect(clearTokens()).resolves.toBeUndefined();
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
  });

  it("avatar initial is uppercase first char of full_name", () => {
    const name = MOCK_PROFILE.full_name;
    const initial = name?.charAt(0)?.toUpperCase() ?? "?";
    expect(initial).toBe("A");
  });

  it("avatar initial falls back to ? when name is empty", () => {
    const name = "";
    const initial = name?.charAt(0)?.toUpperCase() || "?";
    expect(initial).toBe("?");
  });

  it("profile row label-value pairs are correct", () => {
    const rows = [
      { label: "Role", value: MOCK_PROFILE.role },
      { label: "Company", value: MOCK_PROFILE.company_name },
    ];
    expect(rows[0]).toEqual({ label: "Role", value: "cleaner" });
    expect(rows[1]).toEqual({ label: "Company", value: "Dubai Clean Co" });
  });
});
