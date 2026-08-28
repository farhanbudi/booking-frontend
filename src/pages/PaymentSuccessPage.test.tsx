// Catatan E2E (task 7.6): Playwright tidak bisa menjalankan Stripe-hosted
// Checkout. Untuk e2e, mock GET /bookings/:id/checkout-url ke stub lokal, atau
// jalankan `stripe listen` terhadap test backend. Berikut adalah unit test
// komponen yang mem-mock hook polling.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentSuccessPage } from "./PaymentSuccessPage";

vi.mock("../api/client", () => ({
  bookingApi: { getCheckoutUrl: vi.fn() },
  redirectToCheckout: vi.fn(),
}));

vi.mock("../hooks/useBookingConfirmationPoll", () => ({
  useBookingConfirmationPoll: vi.fn(),
}));

import { bookingApi, redirectToCheckout } from "../api/client";
import { useBookingConfirmationPoll } from "../hooks/useBookingConfirmationPoll";

const pollMock = vi.mocked(useBookingConfirmationPoll);
const checkoutMock = vi.mocked(bookingApi.getCheckoutUrl);
const redirectMock = vi.mocked(redirectToCheckout);

function renderSuccess(initial = "/pembayaran/berhasil?booking_id=b1") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <PaymentSuccessPage />
    </MemoryRouter>
  );
}

describe("PaymentSuccessPage", () => {
  beforeEach(() => {
    pollMock.mockReset();
    checkoutMock.mockReset();
    redirectMock.mockReset();
  });

  it("menampilkan konfirmasi saat booking terkonfirmasi", () => {
    pollMock.mockReturnValue({ status: "confirmed", error: null, booking: null });

    renderSuccess();

    expect(screen.getByText("Booking terkonfirmasi!")).toBeInTheDocument();
  });

  it("menampilkan status mengonfirmasi saat masih pending", () => {
    pollMock.mockReturnValue({ status: "pending", error: null, booking: null });

    renderSuccess();

    expect(
      screen.getByText("Pembayaran diterima, mengonfirmasi…")
    ).toBeInTheDocument();
  });

  it("kedaluwarsa menawarkan lanjutkan pembayaran", async () => {
    pollMock.mockReturnValue({ status: "expired", error: null, booking: null });
    checkoutMock.mockResolvedValue({
      booking: {
        id: "b1",
        userId: "u1",
        resourceId: "r1",
        startTime: "2026-08-19T09:00:00.000Z",
        endTime: "2026-08-19T10:00:00.000Z",
        status: "pending",
      },
      payment: {
        checkoutUrl: "https://checkout.stripe.com/resume",
        expiresAt: "2026-08-19T10:00:00.000Z",
      },
    });
    const user = userEvent.setup();

    renderSuccess();

    const btn = await screen.findByRole("button", {
      name: "Lanjutkan pembayaran",
    });
    await user.click(btn);

    expect(checkoutMock).toHaveBeenCalledWith("b1");
    expect(redirectMock).toHaveBeenCalledWith("https://checkout.stripe.com/resume");
  });

  it("menampilkan pesan saat booking_id tidak ada", () => {
    pollMock.mockReturnValue({ status: "loading", error: null, booking: null });

    renderSuccess("/pembayaran/berhasil");

    expect(
      screen.getByText("ID booking tidak ditemukan di URL.")
    ).toBeInTheDocument();
  });
});
