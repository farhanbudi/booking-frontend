import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi, resourceApi, type Resource } from "../api/client";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [date, setDate] = useState(todayISO());
  const [bookedSlots, setBookedSlots] = useState<
    { startTime: string; endTime: string }[]
  >([]);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(60); // menit

  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    resourceApi.get(id).then(setResource).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingSlots(true);
    bookingApi
      .availability(id, date)
      .then(setBookedSlots)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSlots(false));
  }, [id, date]);

  async function handleBook() {
    if (!id) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(start.getTime() + duration * 60_000);

    try {
      await bookingApi.create({
        resourceId: id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setSuccess("Booking berhasil dibuat!");
      // refresh slot terisi supaya langsung terlihat
      const updated = await bookingApi.availability(id, date);
      setBookedSlots(updated);
    } catch (err: any) {
      // Pesan dari backend sudah informatif untuk kasus konflik (409),
      // termasuk saat exclusion constraint di database yang menangkap overlap.
      setError(err.message ?? "Gagal membuat booking");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 px-1">
      <button
        onClick={() => navigate("/")}
        className="text-sm text-muted hover:text-primary mb-4"
      >
        ← Kembali ke daftar ruangan
      </button>

      {resource && (
        <>
          <h1 className="text-2xl font-semibold">{resource.name}</h1>
          <p className="text-muted text-sm mb-6">
            Kapasitas {resource.capacity} orang
            {resource.location ? ` · ${resource.location}` : ""}
          </p>
        </>
      )}

      <div className="card mb-6">
        <label className="block text-sm font-medium mb-1">Tanggal</label>
        <input
          type="date"
          value={date}
          min={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="input-field max-w-xs"
        />

        <h3 className="font-medium mt-5 mb-2">Slot yang sudah terisi</h3>
        {loadingSlots ? (
          <p className="text-sm text-muted">Memuat jadwal...</p>
        ) : bookedSlots.length === 0 ? (
          <p className="text-sm text-muted">
            Belum ada booking pada tanggal ini — semua slot kosong.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {bookedSlots.map((slot, i) => (
              <li
                key={i}
                className="text-sm bg-red-50 text-danger border border-red-200 rounded-full px-3 py-1"
              >
                {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 className="font-medium mb-4">Buat booking baru</h3>

        {error && (
          <p className="text-danger text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg px-3 py-2 mb-4">
            {success}
          </p>
        )}

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Jam mulai</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Durasi</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="input-field"
            >
              <option value={30}>30 menit</option>
              <option value={60}>1 jam</option>
              <option value={90}>1,5 jam</option>
              <option value={120}>2 jam</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleBook}
          disabled={submitting}
          className="btn-primary mt-5"
        >
          {submitting ? "Memproses..." : "Booking ruangan ini"}
        </button>
      </div>
    </div>
  );
}
