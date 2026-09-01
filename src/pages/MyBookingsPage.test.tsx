import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyBookingsPage } from "./MyBookingsPage";
import type { DetailBooking } from "../api/client";

vi.mock("../api/client", () => ({
  bookingApi: {
    availability: vi.fn(),
    create: vi.fn(),
    listMine: vi.fn(),
    cancel: vi.fn(),
    getCheckoutUrl: vi.fn(),
  },
  redirectToCheckout: vi.fn(),
}));

import { bookingApi, redirectToCheckout } from "../api/client";

const bookingMock = vi.mocked(bookingApi);
const redirectMock = vi.mocked(redirectToCheckout);

const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 10 * 60 * 1000).toISOString();

function makeBooking(overrides: Partial<DetailBooking> = {}): DetailBooking {
  return {
    id: "b1",
    userId: "u1",
    resourceId: "r1",
    startTime: "2026-08-19T09:00:00.000Z",
    endTime: "2026-08-19T10:00:00.000Z",
    status: "confirmed",
    user: { name: "Budi" },
    resource: { name: "Ruang A", location: "Lantai 1" },
    ...overrides,
  };
}

function renderMyBookings() {
  return render(<MyBookingsPage />);
}

describe("MyBookingsPage", () => {
  beforeEach(() => {
    bookingMock.listMine.mockReset();
    bookingMock.cancel.mockReset();
    bookingMock.getCheckoutUrl.mockReset();
    redirectMock.mockReset();
  });

  it("menampilkan indikator loading saat mengambil data", () => {
    bookingMock.listMine.mockReturnValue(new Promise(() => {}));

    renderMyBookings();

    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("menampilkan daftar booking dengan label status", async () => {
    bookingMock.listMine.mockResolvedValue([
      makeBooking({ id: "b1", status: "confirmed" }),
      makeBooking({ id: "b2", status: "pending" }),
      makeBooking({ id: "b3", status: "cancelled" }),
    ]);

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
      .mockResolvedValueOnce([
        makeBooking({ id: "b1", status: "confirmed" }),
        makeBooking({ id: "b2", status: "pending" }),
      ])
      .mockResolvedValueOnce([
        makeBooking({ id: "b2", status: "pending" }),
      ]);
    bookingMock.cancel.mockResolvedValue(
      makeBooking({ id: "b1", status: "cancelled" })
    );
    const user = userEvent.setup();

    renderMyBookings();

    await screen.findByText("Terkonfirmasi");
    expect(screen.getAllByRole("button", { name: "Batalkan" })).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Batalkan" })[0]);

    await vi.waitFor(() => expect(bookingMock.cancel).toHaveBeenCalledWith("b1"));
    await vi.waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Batalkan" })).toHaveLength(1)
    );
    expect(screen.queryByText("Terkonfirmasi")).not.toBeInTheDocument();
  });

  it("booking pending menampilkan countdown dan tombol lanjutkan pembayaran", async () => {
    const pending = makeBooking({
      id: "b2",
      status: "pending",
      payment: { expiresAt: future },
    });
    bookingMock.listMine.mockResolvedValue([pending]);
    bookingMock.getCheckoutUrl.mockResolvedValue({
      booking: pending,
      payment: { checkoutUrl: "https://checkout.stripe.com/resume", expiresAt: future },
    });

    renderMyBookings();

    expect(await screen.findByText(/Sisa waktu:/)).toBeInTheDocument();
    const resumeBtn = screen.getByRole("button", { name: "Lanjutkan pembayaran" });
    await userEvent.click(resumeBtn);

    expect(bookingMock.getCheckoutUrl).toHaveBeenCalledWith("b2");
    expect(redirectMock).toHaveBeenCalledWith("https://checkout.stripe.com/resume");
  });

  it("booking pending kedaluwarsa menampilkan pesan tanpa tombol lanjutkan", async () => {
    bookingMock.listMine.mockResolvedValue([
      makeBooking({
        id: "b2",
        status: "pending",
        payment: { expiresAt: past },
      }),
    ]);

    renderMyBookings();

    expect(await screen.findByText(/Waktu pembayaran habis/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lanjutkan pembayaran" })
    ).not.toBeInTheDocument();
  });
});
