import { useEffect, useState } from "react";
import { bookingApi, type Booking } from "../api/client";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const statusStyle: Record<Booking["status"], string> = {
  confirmed: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-gray-100 text-muted border-line",
};

const statusLabel: Record<Booking["status"], string> = {
  confirmed: "Terkonfirmasi",
  pending: "Menunggu",
  cancelled: "Dibatalkan",
};

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    bookingApi
      .listMine()
      .then(setBookings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await bookingApi.cancel(id);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 px-1">
      <h1 className="text-2xl font-semibold mb-6">Booking saya</h1>

      {error && <p className="text-danger mb-4">{error}</p>}
      {loading && <p className="text-muted">Memuat...</p>}

      {!loading && bookings.length === 0 && (
        <div className="card text-center text-muted py-10">
          Kamu belum punya booking. Yuk booking ruangan dulu.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="card flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-medium">
                {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
              </p>
              <span
                className={`inline-block mt-2 text-xs border rounded-full px-2 py-0.5 ${statusStyle[b.status]}`}
              >
                {statusLabel[b.status]}
              </span>
            </div>

            {b.status !== "cancelled" && (
              <button
                onClick={() => handleCancel(b.id)}
                disabled={cancellingId === b.id}
                className="btn-outline text-sm !py-1.5"
              >
                {cancellingId === b.id ? "Membatalkan..." : "Batalkan"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
