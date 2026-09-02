import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { bookingApi, redirectToCheckout, resourceApi } from "../api/client";

const resourceMock = vi.mocked(resourceApi);
const bookingMock = vi.mocked(bookingApi);
const redirectMock = vi.mocked(redirectToCheckout);

const resource: Resource = {
  id: "r1",
  name: "Ruang A",
  capacity: 4,
  location: "Lantai 1",
  isActive: true,
  pricePerHour: null,
};

const paidResource: Resource = { ...resource, pricePerHour: 50000 };

const slots = [
  { startTime: "2026-09-02T09:00:00.000Z", endTime: "2026-09-02T10:00:00.000Z" },
  { startTime: "2026-09-02T10:00:00.000Z", endTime: "2026-09-02T11:00:00.000Z" },
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
  });

  it("menampilkan detail resource dan kalender slot terisi", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue(slots);

    renderBooking();

    expect(await screen.findByText("Ruang A")).toBeInTheDocument();
    expect(screen.getByText(/Kapasitas 4 orang/)).toBeInTheDocument();

    const calendar = document.querySelector(".rbc-calendar");
    expect(calendar).toBeInTheDocument();
    const events = document.querySelectorAll(".rbc-event");
    expect(events).toHaveLength(2);
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

  it("booking sukses menampilkan pesan sukses dan me-refresh slot", async () => {
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

    expect(await screen.findByText("Booking berhasil dibuat!")).toBeInTheDocument();
    expect(bookingMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: "r1" })
    );
    expect(bookingMock.availability).toHaveBeenCalledTimes(2);
  });

  it("booking bentrok menampilkan pesan error backend tanpa pesan sukses", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue([]);
    bookingMock.create.mockRejectedValue(new Error("Slot sudah dipesan"));
    const user = userEvent.setup();

    renderBooking();

    await screen.findByText("Ruang A");

    await user.click(screen.getByRole("button", { name: "Booking ruangan ini" }));

    expect(await screen.findByText("Slot sudah dipesan")).toBeInTheDocument();
    expect(screen.queryByText("Booking berhasil dibuat!")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Booking berhasil dibuat!")).not.toBeInTheDocument();
  });
});
