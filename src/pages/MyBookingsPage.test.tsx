import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyBookingsPage } from "./MyBookingsPage";
import type { Booking } from "../api/client";

vi.mock("../api/client", () => ({
  bookingApi: { availability: vi.fn(), create: vi.fn(), listMine: vi.fn(), cancel: vi.fn() },
}));

import { bookingApi } from "../api/client";

const bookingMock = vi.mocked(bookingApi);

const bookings: Booking[] = [
  {
    id: "b1",
    userId: "u1",
    resourceId: "r1",
    startTime: "2026-08-19T09:00:00.000Z",
    endTime: "2026-08-19T10:00:00.000Z",
    status: "confirmed",
  },
  {
    id: "b2",
    userId: "u1",
    resourceId: "r1",
    startTime: "2026-08-19T11:00:00.000Z",
    endTime: "2026-08-19T12:00:00.000Z",
    status: "pending",
  },
  {
    id: "b3",
    userId: "u1",
    resourceId: "r1",
    startTime: "2026-08-18T09:00:00.000Z",
    endTime: "2026-08-18T10:00:00.000Z",
    status: "cancelled",
  },
];

function renderMyBookings() {
  return render(<MyBookingsPage />);
}

describe("MyBookingsPage", () => {
  beforeEach(() => {
    bookingMock.listMine.mockReset();
    bookingMock.cancel.mockReset();
  });

  it("menampilkan indikator loading saat mengambil data", () => {
    bookingMock.listMine.mockReturnValue(new Promise(() => {}));

    renderMyBookings();

    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("menampilkan daftar booking dengan label status", async () => {
    bookingMock.listMine.mockResolvedValue(bookings);

    renderMyBookings();

    expect(await screen.findByText("Terkonfirmasi")).toBeInTheDocument();
    expect(screen.getByText("Menunggu")).toBeInTheDocument();
    expect(screen.getByText("Dibatalkan")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Batalkan" })).toHaveLength(2);
  });

  it("menampilkan pesan state kosong saat tidak ada booking", async () => {
    bookingMock.listMine.mockResolvedValue([]);

    renderMyBookings();

    expect(
      await screen.findByText(
        "Kamu belum punya booking. Yuk booking ruangan dulu."
      )
    ).toBeInTheDocument();
  });

  it("menampilkan pesan error saat pengambilan gagal", async () => {
    bookingMock.listMine.mockRejectedValue(new Error("Gagal memuat booking"));

    renderMyBookings();

    expect(await screen.findByText("Gagal memuat booking")).toBeInTheDocument();
  });

  it("membatalkan booking, me-refresh daftar, dan menyembunyikan tombol batalkan", async () => {
    bookingMock.listMine
      .mockResolvedValueOnce([bookings[0], bookings[1]])
      .mockResolvedValueOnce([bookings[1]]);
    bookingMock.cancel.mockResolvedValue(bookings[0]);
    const user = userEvent.setup();

    renderMyBookings();

    await screen.findByText("Terkonfirmasi");
    expect(screen.getAllByRole("button", { name: "Batalkan" })).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Batalkan" })[0]);

    await waitFor(() => expect(bookingMock.cancel).toHaveBeenCalledWith("b1"));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Batalkan" })).toHaveLength(1)
    );
    expect(screen.queryByText("Terkonfirmasi")).not.toBeInTheDocument();
  });
});