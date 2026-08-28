import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentCancelPage } from "./PaymentCancelPage";

vi.mock("../api/client", () => ({
  bookingApi: { getCheckoutUrl: vi.fn() },
  redirectToCheckout: vi.fn(),
}));

import { bookingApi, redirectToCheckout } from "../api/client";

const checkoutMock = vi.mocked(bookingApi.getCheckoutUrl);
const redirectMock = vi.mocked(redirectToCheckout);

function renderCancel(initial = "/pembayaran/batal?booking_id=b1") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <PaymentCancelPage />
    </MemoryRouter>
  );
}

describe("PaymentCancelPage", () => {
  beforeEach(() => {
    checkoutMock.mockReset();
    redirectMock.mockReset();
  });

  it("menampilkan pesan pembatalan dan tombol lanjutkan", () => {
    renderCancel();

    expect(screen.getByText("Pembayaran dibatalkan")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lanjutkan pembayaran" })
    ).toBeInTheDocument();
  });

  it("klik lanjutkan mengambil checkout url dan mengalihkan", async () => {
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

    renderCancel();

    await user.click(
      screen.getByRole("button", { name: "Lanjutkan pembayaran" })
    );

    expect(checkoutMock).toHaveBeenCalledWith("b1");
    expect(redirectMock).toHaveBeenCalledWith("https://checkout.stripe.com/resume");
  });

  it("menampilkan pesan saat booking_id tidak ada", () => {
    renderCancel("/pembayaran/batal");

    expect(
      screen.getByText("ID booking tidak ditemukan di URL.")
    ).toBeInTheDocument();
  });
});
