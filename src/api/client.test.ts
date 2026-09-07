import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authApi,
  bookingApi,
  isPaidCreate,
  resourceApi,
  type User,
} from "./client";
import { logger } from "../utils/logger";

function okResponse(data: unknown, status = 200) {
  return { ok: true, status, headers: { get: () => null }, json: async () => data };
}

function failResponse(status: number, body: unknown) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
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

describe("api client - paid booking create", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "tok");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("create berbayar mengembalikan bentuk wrapped dengan payment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse(
          {
            booking: {
              id: "b1",
              userId: "u1",
              resourceId: "r1",
              startTime: "2026-08-19T09:00:00.000Z",
              endTime: "2026-08-19T10:00:00.000Z",
              status: "pending",
            },
            payment: {
              checkoutUrl: "https://checkout.stripe.com/x",
              expiresAt: "2026-08-19T10:00:00.000Z",
            },
          },
          201
        )
      )
    );

    const resp = await bookingApi.create({
      resourceId: "r1",
      startTime: "2026-08-19T09:00:00.000Z",
      endTime: "2026-08-19T10:00:00.000Z",
    });

    expect(isPaidCreate(resp)).toBe(true);
    if (isPaidCreate(resp)) {
      expect(resp.payment.checkoutUrl).toBe("https://checkout.stripe.com/x");
    }
  });

  it("create 409 menampilkan pesan overlap bahasa Indonesia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        failResponse(409, { error: "Slot sudah dipesan" })
      )
    );

    await expect(
      bookingApi.create({
        resourceId: "r1",
        startTime: "2026-08-19T09:00:00.000Z",
        endTime: "2026-08-19T10:00:00.000Z",
      })
    ).rejects.toThrow("Slot sudah dipesan");
  });
});

describe("api client - checkout url", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "tok");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("getCheckoutUrl mengembalikan checkoutUrl", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          booking: {
            id: "b1",
            userId: "u1",
            resourceId: "r1",
            startTime: "2026-08-19T09:00:00.000Z",
            endTime: "2026-08-19T10:00:00.000Z",
            status: "pending",
          },
          payment: {
            checkoutUrl: "https://checkout.stripe.com/y",
            expiresAt: "2026-08-19T10:00:00.000Z",
          },
        })
      )
    );

    const resp = await bookingApi.getCheckoutUrl("b1");
    expect(resp.payment.checkoutUrl).toBe("https://checkout.stripe.com/y");
  });

  it("getCheckoutUrl 403 menampilkan pesan error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        failResponse(403, { error: "Bukan pemilik booking" })
      )
    );

    await expect(bookingApi.getCheckoutUrl("b1")).rejects.toThrow(
      "Bukan pemilik booking"
    );
  });

  it("getCheckoutUrl 409 (bukan pending) menampilkan pesan error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        failResponse(409, { error: "Booking bukan pending" })
      )
    );

    await expect(bookingApi.getCheckoutUrl("b1")).rejects.toThrow(
      "Booking bukan pending"
    );
  });
});

describe("api client - logger instrumentation on non-OK responses", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(logger, "warn").mockImplementation(() => {});
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(logger.warn).mockRestore();
    vi.mocked(logger.error).mockRestore();
  });

  it("calls logger.warn exactly once with path, status, message on non-OK { error } body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(failResponse(409, { error: "Slot sudah dipesan" }))
    );

    await expect(resourceApi.list()).rejects.toThrow("Slot sudah dipesan");

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [message, context] = vi.mocked(logger.warn).mock.calls[0];
    expect(message).toBe("API request gagal");
    expect(context).toEqual({
      path: "/resources",
      status: 409,
      message: "Slot sudah dipesan",
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("calls logger.warn with the Indonesian fallback message when body is invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(failResponse(500, new Error("invalid json")))
    );

    await expect(resourceApi.list()).rejects.toThrow(
      "Request gagal (status 500)"
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [message, context] = vi.mocked(logger.warn).mock.calls[0];
    expect(message).toBe("API request gagal");
    expect(context).toEqual({
      path: "/resources",
      status: 500,
      message: "Request gagal (status 500)",
    });
  });

  it("does NOT call logger.* when response is 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse(me))
    );

    const result = await resourceApi.list();

    expect(result).toEqual(me);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
