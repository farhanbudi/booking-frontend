import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentCountdown } from "./PaymentCountdown";

describe("PaymentCountdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("menampilkan sisa waktu untuk expiry mendatang", () => {
    const base = new Date("2026-08-19T10:00:00.000Z").getTime();
    vi.setSystemTime(base);
    const future = new Date(base + 125000).toISOString(); // 2m 5s

    render(<PaymentCountdown expiresAt={future} />);

    expect(screen.getByText(/Sisa waktu: 02:05/)).toBeInTheDocument();
  });

  it("menampilkan 'Kedaluwarsa' dan memanggil onExpire saat waktu habis", () => {
    const base = new Date("2026-08-19T10:00:00.000Z").getTime();
    vi.setSystemTime(base);
    const future = new Date(base + 2000).toISOString();
    const onExpire = vi.fn();

    render(<PaymentCountdown expiresAt={future} onExpire={onExpire} />);
    expect(screen.getByText(/Sisa waktu:/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Kedaluwarsa")).toBeInTheDocument();
  });
});
