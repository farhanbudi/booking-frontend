import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminBookingsPage } from "./AdminBookingsPage";
import type { DetailBooking } from "../../api/client";

vi.mock("../../api/client", () => ({
  bookingApi: {
    listAll: vi.fn(),
  },
}));

import { bookingApi } from "../../api/client";

const bookingMock = vi.mocked(bookingApi);

const bookings: DetailBooking[] = [
  {
    id: "b1",
    userId: "u1",
    resourceId: "r1",
    startTime: "2026-08-19T09:00:00.000Z",
    endTime: "2026-08-19T10:00:00.000Z",
    status: "confirmed",
    user: { name: "Budi" },
    resource: { name: "Ruang A", location: "Lantai 1" },
  },
  {
    id: "b2",
    userId: "u2",
    resourceId: "r2",
    startTime: "2026-08-19T11:00:00.000Z",
    endTime: "2026-08-19T12:00:00.000Z",
    status: "pending",
    user: { name: "Siti" },
    resource: { name: "Ruang B", location: null },
  },
  {
    id: "b3",
    userId: "u3",
    resourceId: "r1",
    startTime: "2026-08-18T09:00:00.000Z",
    endTime: "2026-08-18T10:00:00.000Z",
    status: "cancelled",
    user: { name: "Andi" },
    resource: { name: "Ruang A", location: "Lantai 1" },
  },
];

function renderAdminBookings() {
  return render(<AdminBookingsPage />);
}

describe("AdminBookingsPage", () => {
  beforeEach(() => {
    bookingMock.listAll.mockReset();
  });

  it("memanggil bookingApi.listAll saat mount", async () => {
    bookingMock.listAll.mockResolvedValue(bookings);

    renderAdminBookings();

    expect(bookingMock.listAll).toHaveBeenCalledTimes(1);
  });

  it("menampilkan semua booking dengan badge status sesuai mapping label", async () => {
    bookingMock.listAll.mockResolvedValue(bookings);

    renderAdminBookings();

    expect(await screen.findByText("Terkonfirmasi")).toBeInTheDocument();
    expect(screen.getByText("Menunggu")).toBeInTheDocument();
    expect(screen.getByText("Dibatalkan")).toBeInTheDocument();
  });

  it("tidak menampilkan tombol edit/cancel/batalkan (read-only)", async () => {
    bookingMock.listAll.mockResolvedValue(bookings);

    renderAdminBookings();

    await screen.findByText("Terkonfirmasi");

    expect(screen.queryByRole("button", { name: /Batalkan/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hapus/ })).not.toBeInTheDocument();
  });

  it("menampilkan pesan error saat listAll gagal", async () => {
    bookingMock.listAll.mockRejectedValue(new Error("Gagal memuat semua booking"));

    renderAdminBookings();

    expect(
      await screen.findByText("Gagal memuat semua booking")
    ).toBeInTheDocument();
  });

  it("menampilkan pesan state kosong saat tidak ada booking", async () => {
    bookingMock.listAll.mockResolvedValue([]);

    renderAdminBookings();

    expect(
      await screen.findByText("Belum ada booking sama sekali.")
    ).toBeInTheDocument();
  });
});
