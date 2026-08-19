import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi, resourceApi, type User } from "./client";

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}

function failResponse(status: number, body: unknown) {
  return {
    ok: false,
    status,
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

const me: User = {
  id: "u1",
  name: "Budi",
  email: "budi@example.com",
  role: "user",
};

describe("api client - request wrapper", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("menambahkan header Authorization Bearer saat token ada di localStorage", async () => {
    localStorage.setItem("token", "tok123");
    const fetchMock = vi.fn().mockResolvedValue(okResponse(me));
    vi.stubGlobal("fetch", fetchMock);

    await authApi.me();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer tok123");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("tidak menambahkan header Authorization saat tidak ada token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(me));
    vi.stubGlobal("fetch", fetchMock);

    await authApi.me();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });
});

describe("api client - error handling", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("mengambil pesan { error } dari body respons non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(failResponse(409, { error: "Slot sudah dipesan" }))
    );

    await expect(resourceApi.list()).rejects.toThrow("Slot sudah dipesan");
  });

  it("memakai pesan fallback bahasa Indonesia saat body bukan JSON valid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(failResponse(500, new Error("invalid json")))
    );

    await expect(resourceApi.list()).rejects.toThrow("Request gagal (status 500)");
  });
});

describe("api client - auth token lifecycle", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("authApi.login menyimpan token ke localStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse({ token: "tok123" }))
    );

    await authApi.login({ email: "budi@example.com", password: "rahasia" });

    expect(localStorage.getItem("token")).toBe("tok123");
  });

  it("authApi.logout menghapus token dari localStorage", () => {
    localStorage.setItem("token", "tok123");

    authApi.logout();

    expect(localStorage.getItem("token")).toBeNull();
  });
});
