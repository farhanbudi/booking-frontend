import { useEffect, useState } from "react";
import { bookingApi, type Booking } from "../../api/client";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date}, ${time}`;
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

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    bookingApi
      .listAll()
      .then(setBookings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="max-w-3xl mx-auto mt-10 px-1">
      <h1 className="text-2xl font-semibold mb-1">Semua booking</h1>
      <p className="text-muted text-sm mb-6">
        Daftar booking dari seluruh user (read-only).
      </p>

      {error && (
        <p className="text-danger text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
      {loading && <p className="text-muted">Memuat...</p>}

      {!loading && bookings.length === 0 && (
        <div className="card text-center text-muted py-10">
          Belum ada booking sama sekali.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <div key={b.id} className="card">
            <p className="font-medium">
              {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
            </p>
            {/* TODO: tampilkan nama resource & user, perlu endpoint join atau fetch terpisah */}
            <p className="text-xs text-muted mt-1">
              Resource: {b.resourceId} · User: {b.userId}
            </p>
            <span
              className={`inline-block mt-2 text-xs border rounded-full px-2 py-0.5 ${statusStyle[b.status]}`}
            >
              {statusLabel[b.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}