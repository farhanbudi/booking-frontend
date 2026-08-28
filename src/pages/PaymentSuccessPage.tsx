import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useBookingConfirmationPoll } from "../hooks/useBookingConfirmationPoll";
import { bookingApi, redirectToCheckout } from "../api/client";

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("booking_id");
  const { status, error } = useBookingConfirmationPoll(bookingId);
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
      <h1 className="text-2xl font-semibold">Status Pembayaran</h1>

      {!bookingId && (
        <p className="text-danger mt-4">ID booking tidak ditemukan di URL.</p>
      )}

      {bookingId && status === "loading" && (
        <p className="text-muted mt-4">Mengonfirmasi pembayaran…</p>
      )}

      {bookingId && status === "pending" && (
        <div className="card mt-4">
          <p className="text-muted">Pembayaran diterima, mengonfirmasi…</p>
          <p className="text-sm text-muted mt-2">
            Biasanya butuh beberapa detik.
          </p>
        </div>
      )}

      {bookingId && status === "confirmed" && (
        <div className="card mt-4 border-green-200">
          <p className="text-green-700 font-medium">Booking terkonfirmasi!</p>
          <p className="text-sm text-muted mt-2">
            Ruangan berhasil dipesan.
          </p>
          <Link to="/my-bookings" className="btn-primary mt-4 inline-block">
            Lihat Booking saya
          </Link>
        </div>
      )}

      {(status === "expired" || status === "cancelled") && (
        <div className="card mt-4 border-amber-200">
          <p className="text-amber-700 font-medium">
            {status === "cancelled"
              ? "Booking dibatalkan oleh sistem."
              : "Waktu pembayaran kedaluwarsa."}
          </p>
          <p className="text-sm text-muted mt-2">
            Slot kamu mungkin sudah dilepaskan. Lanjutkan pembayaran untuk
            mengonfirmasi.
          </p>
          {resumeError && (
            <p className="text-danger text-sm mt-3">{resumeError}</p>
          )}
          <button
            onClick={handleResume}
            disabled={resuming}
            className="btn-primary mt-4"
          >
            {resuming ? "Mengalihkan…" : "Lanjutkan pembayaran"}
          </button>
          <div className="mt-3">
            <Link
              to="/my-bookings"
              className="text-sm text-primary hover:underline"
            >
              Kembali ke Booking saya
            </Link>
          </div>
        </div>
      )}

      {error && status !== "expired" && status !== "cancelled" && (
        <p className="text-danger mt-4">{error}</p>
      )}
    </div>
  );
}
