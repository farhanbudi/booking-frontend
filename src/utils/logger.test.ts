import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

declare global {
  interface Window {
    __recentLogs: Record<string, unknown>[];
  }
}

type LogLevel = "debug" | "info" | "warn" | "error";

async function importLogger(dev: boolean) {
  vi.resetModules();
  vi.stubEnv("DEV", dev);
  return import("./logger");
}

async function importLoggerInProd() {
  return importLogger(false);
}

async function importLoggerInDev() {
  return importLogger(true);
}

describe("logger - level routing", () => {
  let logSpy: MockInstance;
  let warnSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(async () => {
    const { logger } = await importLoggerInDev();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    void logger;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logger.debug() routes to console.log with [DEBUG] prefix", async () => {
    const { logger } = await importLoggerInDev();
    logger.debug("hello");
    expect(logSpy).toHaveBeenCalledTimes(1);
    const firstArg = logSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain("[DEBUG]");
    expect(firstArg).toContain("hello");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logger.info() routes to console.log with [INFO] prefix", async () => {
    const { logger } = await importLoggerInDev();
    logger.info("hi-info");
    expect(logSpy).toHaveBeenCalledTimes(1);
    const firstArg = logSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain("[INFO]");
    expect(firstArg).toContain("hi-info");
  });

  it("logger.warn() routes to console.warn with [WARN] prefix", async () => {
    const { logger } = await importLoggerInDev();
    logger.warn("careful");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const firstArg = warnSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain("[WARN]");
    expect(firstArg).toContain("careful");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logger.error() routes to console.error with [ERROR] prefix", async () => {
    const { logger } = await importLoggerInDev();
    logger.error("boom");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const firstArg = errorSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain("[ERROR]");
    expect(firstArg).toContain("boom");
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("accepts a structured context object as third console arg", async () => {
    const { logger } = await importLoggerInDev();
    logger.warn("msg", { foo: 1 });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][2]).toEqual({ foo: 1 });
  });

  it("passes an empty string as the third arg when no context is given", async () => {
    const { logger } = await importLoggerInDev();
    logger.info("msg");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][2]).toBe("");
  });
});

describe("logger - dev formatting", () => {
  let logSpy: MockInstance;
  let warnSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("emits a CSS-styled %c-formatted message with level tag", async () => {
    const { logger } = await importLoggerInDev();
    logger.warn("styled");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const firstArg = warnSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain("%c");
    expect(firstArg).toContain("[WARN]");
    const cssArg = warnSpy.mock.calls[0][1] as string;
    expect(typeof cssArg).toBe("string");
    expect((cssArg as string).length).toBeGreaterThan(0);
  });

  it("passes the context as the third console arg", async () => {
    const { logger } = await importLoggerInDev();
    const ctx = { foo: 1, bar: "baz" };
    logger.warn("with-ctx", ctx);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][2]).toEqual(ctx);
  });

  it("routes debug/info to console.log (not console.warn/error)", async () => {
    const { logger } = await importLoggerInDev();
    logger.debug("d");
    logger.info("i");
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("logger - prod formatting", () => {
  let logSpy: MockInstance;
  let warnSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("emits a single-line JSON string on the level-matching console method", async () => {
    const { logger } = await importLoggerInProd();
    logger.info("ready", { v: 1 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const firstArg = logSpy.mock.calls[0][0] as string;
    expect(firstArg).not.toContain("%c");
    const parsed = JSON.parse(firstArg) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("ready");
    expect(parsed.context).toEqual({ v: 1 });
    expect(typeof parsed.time).toBe("string");
    expect(() => new Date(parsed.time as string).toISOString()).not.toThrow();
  });

  it("applies no CSS styling in prod (no %c marker)", async () => {
    const { logger } = await importLoggerInProd();
    logger.warn("prod-warn", { id: 7 });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const firstArg = warnSpy.mock.calls[0][0] as string;
    expect(firstArg).not.toContain("%c");
    const parsed = JSON.parse(firstArg);
    expect(parsed.level).toBe("warn");
    expect(parsed.context).toEqual({ id: 7 });
  });

  it("routes debug/info to console.log, warn to console.warn, error to console.error", async () => {
    const { logger } = await importLoggerInProd();
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    for (const call of [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]) {
      expect(call[0]).not.toContain("%c");
    }
  });

  it("omits the context field in prod JSON when none is passed", async () => {
    const { logger } = await importLoggerInProd();
    logger.info("no-ctx");
    const firstArg = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(firstArg);
    expect(parsed).not.toHaveProperty("context");
  });
});

describe("logger - ring buffer (dev)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("starts empty (window.__recentLogs === [])", async () => {
    const mod = await importLoggerInDev();
    expect(window.__recentLogs).toEqual([]);
    void mod;
  });

  it("appends each entry in order", async () => {
    const { logger } = await importLoggerInDev();
    logger.info("a");
    logger.info("b");
    logger.info("c");
    expect(window.__recentLogs.length).toBe(3);
    expect(window.__recentLogs[0].message).toBe("a");
    expect(window.__recentLogs[1].message).toBe("b");
    expect(window.__recentLogs[2].message).toBe("c");
  });

  it("caps at exactly 50 entries when 55 are logged, dropping oldest first", async () => {
    const { logger } = await importLoggerInDev();
    for (let i = 0; i < 55; i++) {
      logger.info(`e-${i}`);
    }
    expect(window.__recentLogs.length).toBe(50);
    expect(window.__recentLogs[0].message).toBe("e-5");
    expect(window.__recentLogs[49].message).toBe("e-54");
    for (let i = 0; i < 50; i++) {
      expect(window.__recentLogs[i].message).toBe(`e-${i + 5}`);
    }
  });

  it("buffer length stays monotonic and bounded at 50", async () => {
    const { logger } = await importLoggerInDev();
    for (let i = 0; i < 200; i++) {
      logger.info(`x-${i}`);
    }
    expect(window.__recentLogs.length).toBe(50);
    expect(window.__recentLogs[0].message).toBe("x-150");
    expect(window.__recentLogs[49].message).toBe("x-199");
  });
});

describe("logger - window.__recentLogs exposure", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("sets window.__recentLogs in dev mode", async () => {
    await importLoggerInDev();
    expect(window.__recentLogs).toBeDefined();
    expect(Array.isArray(window.__recentLogs)).toBe(true);
  });

  it("does NOT set window.__recentLogs in prod mode", async () => {
    const w = window as unknown as Record<string, unknown>;
    delete w.__recentLogs;
    await importLoggerInProd();
    expect(w.__recentLogs).toBeUndefined();
  });
});

describe("logger - no network egress", () => {
  let fetchSpy: MockInstance;
  let beaconSpy: MockInstance;
  let imageSpy: MockInstance;
  let wsSpy: MockInstance;
  let beaconDescriptor: PropertyDescriptor | undefined;

  beforeEach(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 200 })
    );

    beaconDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "sendBeacon"
    );
    const beaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: beaconMock,
    });
    beaconSpy = vi.mocked(beaconMock);

    imageSpy = vi
      .spyOn(window, "Image")
      .mockImplementation(function () {
        return {} as HTMLImageElement;
      } as unknown as typeof Image) as unknown as MockInstance;
    wsSpy = vi
      .spyOn(window, "WebSocket")
      .mockImplementation(function () {
        return {} as WebSocket;
      } as unknown as typeof WebSocket) as unknown as MockInstance;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    if (beaconDescriptor) {
      Object.defineProperty(navigator, "sendBeacon", beaconDescriptor);
    } else {
      delete (navigator as unknown as Record<string, unknown>).sendBeacon;
    }
  });

  it("never calls fetch when logging", async () => {
    const { logger } = await importLoggerInDev();
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e", { x: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never calls navigator.sendBeacon when logging", async () => {
    const { logger } = await importLoggerInDev();
    logger.error("boom");
    expect(beaconSpy).not.toHaveBeenCalled();
  });

  it("never instantiates Image for image-ping when logging", async () => {
    const { logger } = await importLoggerInDev();
    logger.warn("ping?");
    expect(imageSpy).not.toHaveBeenCalled();
  });

  it("never opens a WebSocket when logging", async () => {
    const { logger } = await importLoggerInDev();
    logger.error("ws?");
    expect(wsSpy).not.toHaveBeenCalled();
  });

  it("only side effects are console.* and the in-memory array push", async () => {
    const { logger } = await importLoggerInDev();
    logger.info("only-these", { k: "v" });
    expect(window.__recentLogs.length).toBe(1);
    expect(window.__recentLogs[0]).toMatchObject({
      level: "info",
      message: "only-these",
      context: { k: "v" },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
    expect(imageSpy).not.toHaveBeenCalled();
    expect(wsSpy).not.toHaveBeenCalled();
  });
});