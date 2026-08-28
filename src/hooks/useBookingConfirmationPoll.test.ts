import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingConfirmationPoll } from "./useBookingConfirmationPoll";
import type { Booking } from "../api/client";

vi.mock("../api/client", () => ({
  bookingApi: { listMine: vi.fn() },
}));

import { bookingApi } from "../api/client";

const listMock = vi.mocked(bookingApi.listMine);

const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 10 * 60 * 1000).toISOString();

function base(status: Booking["status"], expiresAt?: string): Booking {
  return {
    id: "b1",
    userId: "u1",
    resourceId: "r1",
    startTime: "2026-08-19T09:00:00.000Z",
    endTime: "2026-08-19T10:00:00.000Z",
    status,
    ...(expiresAt ? { payment: { expiresAt } } : {}),
  };
}

function Probe({ id }: { id: string }) {
  const { status } = useBookingConfirmationPoll(id);
  return createElement("div", null, status);
}

describe("useBookingConfirmationPoll", () => {
  beforeEach(() => listMock.mockReset());

  it("status 'confirmed' saat booking terkonfirmasi", async () => {
    listMock.mockResolvedValue([base("confirmed")]);
    render(createElement(Probe, { id: "b1" }));
    expect(await screen.findByText("confirmed")).toBeInTheDocument();
  });

  it("status 'pending' untuk booking pending dengan expiry mendatang", async () => {
    listMock.mockResolvedValue([base("pending", future)]);
    render(createElement(Probe, { id: "b1" }));
    expect(await screen.findByText("pending")).toBeInTheDocument();
  });

  it("status 'cancelled' saat booking dibatalkan", async () => {
    listMock.mockResolvedValue([base("cancelled")]);
    render(createElement(Probe, { id: "b1" }));
    expect(await screen.findByText("cancelled")).toBeInTheDocument();
  });

  it("status 'expired' untuk pending dengan expiry lewat", async () => {
    listMock.mockResolvedValue([base("pending", past)]);
    render(createElement(Probe, { id: "b1" }));
    expect(await screen.findByText("expired")).toBeInTheDocument();
  });

  it("tetap 'loading' saat booking tidak ditemukan", async () => {
    listMock.mockResolvedValue([]);
    render(createElement(Probe, { id: "b1" }));
    expect(await screen.findByText("loading")).toBeInTheDocument();
  });
});
