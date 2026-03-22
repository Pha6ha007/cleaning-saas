// mobile-cleaner/src/api/__tests__/fetchMe.test.ts
/**
 * M012/S01 — fetchMe() unit tests
 *
 * Tests:
 * 1. fetchMe calls /api/me/ with GET
 * 2. fetchMe returns typed CleanerProfile
 * 3. fetchMe throws on non-2xx
 */

const mockStorage: Record<string, string> = {
  "@jwt_access_token": "test.jwt.token",
};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => mockStorage[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => { delete mockStorage[key]; }),
}));

// Mock navigation
jest.mock("../../navigation", () => ({
  resetToLogin: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

import { fetchMe, loadStoredToken } from "../client";

const PROFILE_RESPONSE = {
  id: 1,
  email: "tech@example.com",
  full_name: "Test Tech",
  role: "cleaner",
  company_name: "Test Co",
};

function mockSuccessResponse(body: object, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: { get: () => "application/json" },
  });
}

function mockErrorResponse(status: number, body = "{}") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
    headers: { get: () => "application/json" },
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  // Prime the token so apiFetch includes Authorization header
  await loadStoredToken();
});

describe("fetchMe", () => {
  it("calls GET /api/me/", async () => {
    mockSuccessResponse(PROFILE_RESPONSE);
    await fetchMe();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/me/");
    expect(opts?.method).toBe("GET");
  });

  it("returns CleanerProfile data", async () => {
    mockSuccessResponse(PROFILE_RESPONSE);
    const profile = await fetchMe();
    expect(profile.id).toBe(1);
    expect(profile.email).toBe("tech@example.com");
    expect(profile.full_name).toBe("Test Tech");
    expect(profile.role).toBe("cleaner");
    expect(profile.company_name).toBe("Test Co");
  });

  it("throws on 404 response", async () => {
    mockErrorResponse(404, "Not found");
    await expect(fetchMe()).rejects.toThrow();
  });
});
