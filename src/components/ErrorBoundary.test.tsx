import { Component, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from "../utils/logger";
import { ErrorBoundary } from "./ErrorBoundary";

class BoomBoundary extends Component<{ children?: ReactNode }> {
  render(): ReactNode {
    throw new Error("boom-from-child");
  }
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.mocked(logger.error).mockClear();
    vi.mocked(logger.warn).mockClear();
    vi.mocked(logger.info).mockClear();
    vi.mocked(logger.debug).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <div>child-content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("child-content")).toBeInTheDocument();
    expect(screen.queryByText("Ada yang tidak beres")).not.toBeInTheDocument();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("renders the fallback UI when a descendant throws during render", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BoomBoundary />
      </ErrorBoundary>
    );

    expect(screen.getByText("Ada yang tidak beres")).toBeInTheDocument();
    expect(
      screen.getByText("Terjadi kesalahan yang tidak terduga. Coba muat ulang halaman.")
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Muat ulang" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("btn-primary");
    expect(screen.queryByText("child-content")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("calls logger.error exactly once with message, stack, componentStack", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BoomBoundary />
      </ErrorBoundary>
    );

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message, context] = vi.mocked(logger.error).mock.calls[0];
    expect(message).toBe("Unhandled error di React component");
    expect(context).toBeDefined();
    expect(context).toHaveProperty("message", "boom-from-child");
    expect(typeof (context as Record<string, unknown>).stack).toBe("string");
    expect(typeof (context as Record<string, unknown>).componentStack).toBe(
      "string"
    );
    consoleError.mockRestore();
  });

  it("calls window.location.reload when the reload button is clicked", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const reloadMock = vi.fn();
    const originalLocation = window.location;
    try {
      Object.defineProperty(window, "location", {
        configurable: true,
        writable: true,
        value: {
          ...originalLocation,
          reload: reloadMock,
        } as unknown as Location,
      });

      render(
        <ErrorBoundary>
          <BoomBoundary />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole("button", { name: "Muat ulang" }));

      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        writable: true,
        value: originalLocation,
      });
    }
    consoleError.mockRestore();
  });

  it("does not render the original children after the boundary has captured an error", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BoomBoundary />
      </ErrorBoundary>
    );

    expect(screen.queryByText("child-content")).not.toBeInTheDocument();
    expect(screen.getByText("Ada yang tidak beres")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});