// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach, describe } from "vitest";
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

// Mock server-only so the module can be imported in tests
vi.mock("server-only", () => ({}));

// Cookie store mock
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no cookie
  mockCookieStore.get.mockReturnValue(undefined);
});

// --- createSession ---

describe("createSession", () => {
  test("sets an httpOnly cookie with the auth token", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, _token, options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("sets cookie expiry ~7 days in the future", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("stores a non-empty JWT string", async () => {
    await createSession("user-1", "test@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });

  test("embeds userId and email in the token payload", async () => {
    await createSession("user-123", "payload@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "development-secret-key"
    );
    const { payload } = await jwtVerify(token, secret);

    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("payload@example.com");
  });

  test("sets secure: false in non-production environment", async () => {
    const originalEnv = process.env.NODE_ENV;
    // @ts-ignore
    process.env.NODE_ENV = "development";

    await createSession("user-1", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);

    // @ts-ignore
    process.env.NODE_ENV = originalEnv;
  });

  test("sets secure: true in production environment", async () => {
    const originalEnv = process.env.NODE_ENV;
    // @ts-ignore
    process.env.NODE_ENV = "production";

    await createSession("user-1", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(true);

    // @ts-ignore
    process.env.NODE_ENV = originalEnv;
  });
});

// --- getSession ---

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for an invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    // Create a real token first
    await createSession("user-42", "hello@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    mockCookieStore.get.mockReturnValue({ value: token });
    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-42");
    expect(session!.email).toBe("hello@example.com");
  });
});

// --- deleteSession ---

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

// --- verifySession ---

describe("verifySession", () => {
  function makeRequest(token?: string): NextRequest {
    const req = new NextRequest("http://localhost/api/test");
    if (token) {
      req.cookies.set("auth-token", token);
    }
    return req;
  }

  test("returns null when request has no cookie", async () => {
    const req = makeRequest();
    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns null for an invalid token in request", async () => {
    const req = makeRequest("bad.token.here");
    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in request", async () => {
    await createSession("user-99", "verify@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    const req = makeRequest(token);
    const session = await verifySession(req);

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-99");
    expect(session!.email).toBe("verify@example.com");
  });
});
