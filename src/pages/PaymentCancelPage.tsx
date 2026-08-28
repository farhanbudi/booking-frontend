import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { bookingApi, redirectToCheckout } from "../api/client";

export function PaymentCancelPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("booking_id");
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);

  async function handleResume() {
    if (!bookingId) return;
    setResuming(true);
    setResumeError(null);
    try {
      const { payment } = await bookingApi.getCheckoutUrl(bookingId);
      redirectToCheckout(payment.checkoutUrl);
    } catch (err: any) {
      setResumeError(err?.message ?? "Gagal memuat tautan pembayaran");
      setResuming(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 px-1 text-center">
      <h1 className="text-2xl font-semibold">Pembayaran dibatalkan</h1>
      <p className="text-muted text-sm mt-2">
        Slot ruangan kamu masih ditahan. Selesaikan pembayaran untuk
        mengonfirmasi booking.
      </p>

      {!bookingId && (
        <p className="text-danger mt-4">ID booking tidak ditemukan di URL.</p>
      )}

      {resumeError && <p className="text-danger text-sm mt-4">{resumeError}</p>}

      <button
        onClick={handleResume}
        disabled={!bookingId || resuming}
        className="btn-primary mt-5"
      >
        {resuming ? "Mengalihkan…" : "Lanjutkan pembayaran"}
      </button>

      <div className="mt-4">
        <Link
          to="/my-bookings"
          className="text-sm text-primary hover:underline"
        >
          Kembali ke Booking saya
        </Link>
      </div>
    </div>
  );
}
