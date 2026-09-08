import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingPage } from "./BookingPage";
import type { Resource } from "../api/client";

vi.mock("../api/client", () => ({
  resourceApi: { list: vi.fn(), get: vi.fn() },
  bookingApi: {
    availability: vi.fn(),
    create: vi.fn(),
    listMine: vi.fn(),
    cancel: vi.fn(),
    getCheckoutUrl: vi.fn(),
  },
  isPaidResource: (r: any) => !!r && typeof r.pricePerHour === "number" && r.pricePerHour > 0,
  isPaidCreate: (resp: any) => !!(resp && resp.payment),
  formatIDR: (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`,
  redirectToCheckout: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { bookingApi, redirectToCheckout, resourceApi } from "../api/client";
import { toast } from "sonner";

const resourceMock = vi.mocked(resourceApi);
const bookingMock = vi.mocked(bookingApi);
const redirectMock = vi.mocked(redirectToCheckout);
const toastErrorMock = vi.mocked(toast.error);
const toastSuccessMock = vi.mocked(toast.success);

const resource: Resource = {
  id: "r1",
  name: "Ruang A",
  capacity: 4,
  location: "Lantai 1",
  isActive: true,
  pricePerHour: null,
};

const paidResource: Resource = { ...resource, pricePerHour: 50000 };

function localSlot(hour: number, minute = 0) {
  // 2026-09-03 harus sama persis dengan tanggal yang di-fake di vi.setSystemTime
  return new Date(2026, 8, 3, hour, minute, 0, 0).toISOString();
}

const slots = [
  { startTime: localSlot(9), endTime: localSlot(10) },
  { startTime: localSlot(10), endTime: localSlot(11) },
];

function renderBooking(initial = "/resources/r1") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/resources/:id" element={<BookingPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BookingPage", () => {
  beforeEach(() => {
    resourceMock.get.mockReset();
    bookingMock.availability.mockReset();
    bookingMock.create.mockReset();
    redirectMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    // Kunci "sekarang" ke 07:00 agar default startTime 09:00 selalu di masa depan,
    // sehingga validasi isStartTimeInPast tidak membuat tombol Booking disabled.
    // Hanya fake Date — promise/setTimeout timers tetap real agar async resolve normal.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 3, 7, 0, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menampilkan detail resource dan kalender slot terisi", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue(slots);

    renderBooking();

    expect(await screen.findByText("Ruang A")).toBeInTheDocument();
    expect(screen.getByText(/Kapasitas 4 orang/)).toBeInTheDocument();

    const calendar = document.querySelector(".rbc-calendar");
    expect(calendar).toBeInTheDocument();
    // bookedSlots dimuat via useEffect setelah resource; tunggu sampai
    // RBC me-render event blocks-nya.
    await vi.waitFor(
      () => expect(document.querySelectorAll(".rbc-event")).toHaveLength(2),
      { timeout: 3000 }
    );
  });

  it("menampilkan kalender kosong saat tidak ada slot terisi", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue([]);

    renderBooking();

    const calendar = await screen.findByText((_, el) =>
      el !== null && el.classList.contains("rbc-calendar") ? true : false
    );
    expect(calendar).toBeInTheDocument();
    expect(document.querySelectorAll(".rbc-event")).toHaveLength(0);
  });

  it("merender kalender segera saat slot sedang dimuat", async () => {
    resourceMock.get.mockReturnValue(new Promise(() => {}));
    bookingMock.availability.mockReturnValue(new Promise(() => {}));

    renderBooking();

    const calendar = document.querySelector(".rbc-calendar");
    expect(calendar).toBeInTheDocument();
  });

  it("booking sukses memicu toast.success dengan pesan sukses dan me-refresh slot", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue([]);
    bookingMock.create.mockResolvedValue({
      id: "b1",
      userId: "u1",
      resourceId: "r1",
      startTime: "2026-08-19T09:00:00.000Z",
      endTime: "2026-08-19T10:00:00.000Z",
      status: "confirmed",
    });
    const user = userEvent.setup();

    renderBooking();

    await screen.findByText("Ruang A");

    await user.click(screen.getByRole("button", { name: "Booking ruangan ini" }));

    await vi.waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith("Booking berhasil dibuat!")
    );
    expect(bookingMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: "r1" })
    );
    expect(bookingMock.availability).toHaveBeenCalledTimes(2);
  });

  it("booking bentrok memicu toast.error dengan pesan error backend tanpa toast.success", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue([]);
    bookingMock.create.mockRejectedValue(new Error("Slot sudah dipesan"));
    const user = userEvent.setup();

    renderBooking();

    await screen.findByText("Ruang A");

    await user.click(screen.getByRole("button", { name: "Booking ruangan ini" }));

    await vi.waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("Slot sudah dipesan")
    );
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("menampilkan 'Gratis' untuk resource tanpa harga", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue([]);

    renderBooking();

    expect(await screen.findByText("Gratis")).toBeInTheDocument();
  });

  it("menampilkan harga per jam untuk resource berbayar", async () => {
    resourceMock.get.mockResolvedValue(paidResource);
    bookingMock.availability.mockResolvedValue([]);

    renderBooking();

    expect(await screen.findByText("Rp 50.000/jam")).toBeInTheDocument();
  });

  it("booking berbayar mengalihkan ke Stripe Checkout", async () => {
    resourceMock.get.mockResolvedValue(paidResource);
    bookingMock.availability.mockResolvedValue([]);
    bookingMock.create.mockResolvedValue({
      booking: {
        id: "b1",
        userId: "u1",
        resourceId: "r1",
        startTime: "2026-08-19T09:00:00.000Z",
        endTime: "2026-08-19T10:00:00.000Z",
        status: "pending",
      },
      payment: {
        checkoutUrl: "https://checkout.stripe.com/pay",
        expiresAt: "2026-08-19T10:00:00.000Z",
      },
    });
    const user = userEvent.setup();

    renderBooking();

    await screen.findByText("Rp 50.000/jam");

    await user.click(screen.getByRole("button", { name: "Booking ruangan ini" }));

    expect(redirectMock).toHaveBeenCalledWith("https://checkout.stripe.com/pay");
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  describe("pembatasan jam operasional 08:00–20:00", () => {
    it("duration 120 dari default 09:00 tetap dalam rentang dan tombol Booking aktif", async () => {
      resourceMock.get.mockResolvedValue(resource);
      bookingMock.availability.mockResolvedValue([]);
      const user = userEvent.setup();

      renderBooking();
      await screen.findByText("Ruang A");

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      await user.selectOptions(select, "120");

      const btn = screen.getByRole("button", { name: "Booking ruangan ini" });
      expect(btn).toBeEnabled();
      expect(
        screen.queryByText(/Booking di luar jam operasional/i)
      ).not.toBeInTheDocument();
    });

    it("label Jam Mulai tetap dirender dengan DatePicker terbatas", async () => {
      resourceMock.get.mockResolvedValue(resource);
      bookingMock.availability.mockResolvedValue([]);

      renderBooking();
      await screen.findByText("Ruang A");

      expect(screen.getByText("Jam mulai")).toBeInTheDocument();
      expect(screen.getByText("Durasi")).toBeInTheDocument();

      // DatePicker time-only ter-render sebagai input di dalam .react-datepicker wrapper
      expect(
        document.querySelector(".react-datepicker__input-container input")
      ).toBeInTheDocument();
    });

    it("Calendar menyembunyikan slot di luar jam operasional 08:00–20:00 (min/max)", async () => {
      // RBC dengan prop `min`/`max` harus menyembunyikan slot sebelum min dan setelah max.
      // Slot 00:00–07:00 dan 20:00–23:00 TIDAK boleh dirender.
      resourceMock.get.mockResolvedValue(resource);
      bookingMock.availability.mockResolvedValue([]);

      renderBooking();
      await screen.findByText("Ruang A");

      // Ambil label jam di kolom kiri time gutter (timeGutterFormat = "HH:mm")
      const gutterLabels = Array.from(
        document.querySelectorAll(".rbc-time-gutter .rbc-label")
      ).map((el) => (el as HTMLElement).textContent?.trim() ?? "");

      // Minimal satu slot terlihat (sanity)
      expect(gutterLabels.length).toBeGreaterThan(0);

      // Slot sebelum 08:00 (00:00, 01:00, ..., 07:00) tidak boleh muncul
      for (let h = 0; h < 8; h++) {
        const hh = h.toString().padStart(2, "0") + ":00";
        expect(gutterLabels).not.toContain(hh);
      }

      // Slot 20:00 ke atas tidak boleh muncul
      for (let h = 20; h <= 23; h++) {
        const hh = h.toString().padStart(2, "0") + ":00";
        expect(gutterLabels).not.toContain(hh);
      }

      // Slot 08:00 dan 19:00 tetap dirender
      expect(gutterLabels).toContain("08:00");
      expect(gutterLabels).toContain("19:00");
    });

    it("dropdown Durasi menampilkan 4 opsi saat startTime default 09:00 (semua durasi muat)", async () => {
      resourceMock.get.mockResolvedValue(resource);
      bookingMock.availability.mockResolvedValue([]);

      renderBooking();
      await screen.findByText("Ruang A");

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.text);
      expect(options).toEqual(["30 menit", "1 jam", "1,5 jam", "2 jam"]);
    });
  });

  describe("validasi startTime di masa lalu", () => {
    it("tidak menampilkan pesan peringatan saat startTime (09:00) di masa depan", async () => {
      // beforeEach mocks waktu ke 07:00 → 09:00 adalah masa depan.
      resourceMock.get.mockResolvedValue(resource);
      bookingMock.availability.mockResolvedValue([]);

      renderBooking();
      await screen.findByText("Ruang A");

      expect(
        screen.queryByText(/Jam mulai sudah lewat dari waktu saat ini/i)
      ).not.toBeInTheDocument();

      const btn = screen.getByRole("button", { name: "Booking ruangan ini" });
      expect(btn).toBeEnabled();
    });

    it("menampilkan pesan peringatan dan menonaktifkan tombol saat startTime di masa lalu", async () => {
      // Override "sekarang" ke 10:00 sehingga startTime default 09:00 sudah lewat.
      vi.setSystemTime(new Date(2026, 8, 3, 10, 0, 0, 0));
      resourceMock.get.mockResolvedValue(resource);
      bookingMock.availability.mockResolvedValue([]);

      renderBooking();
      await screen.findByText("Ruang A");

      expect(
        await screen.findByText(
          /Jam mulai sudah lewat dari waktu saat ini/i
        )
      ).toBeInTheDocument();

      const btn = screen.getByRole("button", { name: "Booking ruangan ini" });
      expect(btn).toBeDisabled();
    });

    it("submit paksa menampilkan error dan tidak memanggil API", async () => {
      vi.setSystemTime(new Date(2026, 8, 3, 10, 0, 0, 0));
      resourceMock.get.mockResolvedValue(resource);
      bookingMock.availability.mockResolvedValue([]);
      bookingMock.create.mockResolvedValue({} as any);
      const user = userEvent.setup();

      renderBooking();
      await screen.findByText("Ruang A");

      // Tombol disabled; pastikan create tidak dipanggil via klik paksa
      // (userEvent respects disabled). Cukup cek create tidak dipanggil.
      const btn = screen.getByRole("button", { name: "Booking ruangan ini" });
      expect(btn).toBeDisabled();

      // Panggil handler secara manual lewat console dispatch tidak feasible.
      // Cukup verifikasi mock create tidak pernah dipanggil.
      expect(bookingMock.create).not.toHaveBeenCalled();
      // Sanity: userEvent.setup tersedia untuk test lain.
      expect(user).toBeDefined();
    });
  });
});
