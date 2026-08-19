import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingPage } from "./BookingPage";
import type { Resource } from "../api/client";

vi.mock("../api/client", () => ({
  resourceApi: { list: vi.fn(), get: vi.fn() },
  bookingApi: { availability: vi.fn(), create: vi.fn(), listMine: vi.fn(), cancel: vi.fn() },
}));

import { bookingApi, resourceApi } from "../api/client";

const resourceMock = vi.mocked(resourceApi);
const bookingMock = vi.mocked(bookingApi);

const resource: Resource = {
  id: "r1",
  name: "Ruang A",
  capacity: 4,
  location: "Lantai 1",
  isActive: true,
};

const slots = [
  { startTime: "2026-08-19T09:00:00.000Z", endTime: "2026-08-19T10:00:00.000Z" },
  { startTime: "2026-08-19T10:00:00.000Z", endTime: "2026-08-19T11:00:00.000Z" },
];

function renderBooking() {
  return render(
    <MemoryRouter initialEntries={["/resources/r1"]}>
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
  });

  it("menampilkan detail resource dan daftar slot terisi", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue(slots);

    renderBooking();

    expect(await screen.findByText("Ruang A")).toBeInTheDocument();
    expect(screen.getByText(/Kapasitas 4 orang/)).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    items.forEach((item) =>
      expect(item.textContent).toMatch(/\d{2}[:.]\d{2}–\d{2}[:.]\d{2}/)
    );
  });

  it("menampilkan pesan semua slot kosong saat tidak ada slot terisi", async () => {
    resourceMock.get.mockResolvedValue(resource);
    bookingMock.availability.mockResolvedValue([]);

    renderBooking();

    expect(
      await screen.findByText(/semua slot kosong/)
    ).toBeInTheDocument();
  });

  it("menampilkan indikator loading jadwal saat slot dimuat", () => {
    resourceMock.get.mockReturnValue(new Promise(() => {}));
    bookingMock.availability.mockReturnValue(new Promise(() => {}));

    renderBooking();

    expect(screen.getByText("Memuat jadwal...")).toBeInTheDocument();
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

    await screen.findByText(/semua slot kosong/);

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

    await screen.findByText(/semua slot kosong/);

    await user.click(screen.getByRole("button", { name: "Booking ruangan ini" }));

    expect(await screen.findByText("Slot sudah dipesan")).toBeInTheDocument();
    expect(screen.queryByText("Booking berhasil dibuat!")).not.toBeInTheDocument();
  });
});