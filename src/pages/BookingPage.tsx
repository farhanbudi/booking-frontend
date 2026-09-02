import { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { id as idLocale } from "date-fns/locale";
import { format, parse, startOfWeek, getDay, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { useNavigate, useParams } from "react-router-dom";
import {
  bookingApi,
  isPaidCreate,
  redirectToCheckout,
  resourceApi,
  type Resource,
} from "../api/client";
import { PriceTag } from "../components/PriceTag";
import { CustomToolbar } from "../components/CalendarToolbar";

registerLocale("id", idLocale);

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTime(): Date {
  const t = new Date();
  t.setHours(9, 0, 0, 0);
  return t;
}

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [date, setDate] = useState<Date>(startOfToday());
  const [bookedSlots, setBookedSlots] = useState<
    { startTime: string; endTime: string }[]
  >([]);
  const [startTime, setStartTime] = useState<Date>(defaultTime());
  const [duration, setDuration] = useState(60); // menit

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [rateLimitLeft, setRateLimitLeft] = useState(0);

  // state untuk highlight, dipakai baik saat drag (sementara) maupun setelah lepas (persist)
  const [highlightRange, setHighlightRange] = useState<{
    start: Date;
    end: Date;
    valid: boolean;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    resourceApi.get(id).then(setResource).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    bookingApi
      .availability(id, dateToISO(date))
      .then(setBookedSlots)
      .catch((err) => setError(err.message));
  }, [id, date]);

  async function handleBook() {
    if (!id) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const start = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      startTime.getHours(),
      startTime.getMinutes(),
      0,
      0
    );
    const end = new Date(start.getTime() + duration * 60_000);

    try {
      const resp = await bookingApi.create({
        resourceId: id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      if (isPaidCreate(resp)) {
        setRedirecting(true);
        redirectToCheckout(resp.payment.checkoutUrl);
        return;
      }

      setSuccess("Booking berhasil dibuat!");
      // refresh slot terisi supaya langsung terlihat
      const updated = await bookingApi.availability(id, dateToISO(date));
      setBookedSlots(updated);
    } catch (err: any) {
      // Pesan dari backend sudah informatif untuk kasus konflik (409),
      // termasuk saat exclusion constraint di database yang menangkap overlap.
      setError(err?.message ?? "Gagal membuat booking");

      // Rate limit 429: baca header Retry-After (detik) dan nonaktifkan
      // tombol Booking sementara sambil menampilkan hitung mundur.
      if (err.status === 429) {
        const seconds = err.retryAfter && err.retryAfter > 0
          ? err.retryAfter
          : 60;
        setRateLimitLeft(seconds);
      }
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (rateLimitLeft <= 0) return;
    const timer = setInterval(() => {
      setRateLimitLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitLeft]);

  const isBlocked = rateLimitLeft > 0 || submitting || redirecting;

  const allowedDurations = [30, 60, 90, 120];

  // dipanggil terus-menerus SELAMA drag berlangsung
  function handleSelecting(range: { start: Date; end: Date }) {
    const minutes = (range.end.getTime() - range.start.getTime()) / 60_000;
    const valid = allowedDurations.includes(minutes);

    setHighlightRange({ start: range.start, end: range.end, valid });
    return true; // tetap izinkan seleksi berlanjut
  }

  // dipanggil SEKALI saat mouse dilepas
  function handleSelectSlot(slotInfo: { start: Date; end: Date }) {
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      slotInfo.start.getHours(),
      slotInfo.start.getMinutes(),
      0,
      0
    );
    setStartTime(next);

    const minutes = (slotInfo.end.getTime() - slotInfo.start.getTime()) / 60_000;
    const isValid = allowedDurations.includes(minutes);

    let finalDuration: number;
    let finalEnd: Date;

    if (isValid) {
      // durasi drag persis pas salah satu opsi (30/60/90/120)
      finalDuration = minutes;
      finalEnd = slotInfo.end;
    } else {
      // tidak valid -> potong jadi 2 jam pertama saja
      finalDuration = 120;
      finalEnd = new Date(next.getTime() + 120 * 60_000);
    }

    setDuration(finalDuration);

    // highlight final persist (tidak di-reset ke null)
    setHighlightRange({ start: next, end: finalEnd, valid: true });
  }

  // styling per slot berdasarkan highlightRange yang sudah persist
  function slotPropGetter(slotDate: Date) {
    if (!highlightRange) return {};

    const isWithinRange =
      slotDate >= highlightRange.start && slotDate < highlightRange.end;

    if (!isWithinRange) return {};

    return {
      style: {
        backgroundColor: highlightRange.valid
          ? "rgba(46, 204, 113, 0.35)" // hijau
          : "rgba(192, 57, 43, 0.25)", // merah
      },
    };
  }

  const calendarEvents = bookedSlots.map((slot) => ({
    start: new Date(slot.startTime),
    end: new Date(slot.endTime),
  }));

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
          <p className="text-muted text-sm mb-1">
            Kapasitas {resource.capacity} orang
            {resource.location ? ` · ${resource.location}` : ""}
          </p>
          <PriceTag resource={resource} />
        </>
      )}

      <div className="card mb-6">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          defaultView="day"
          views={["day"] as View[]}
          date={date}
          onNavigate={(newDate) => setDate(startOfDay(newDate))}
          onSelectSlot={handleSelectSlot}
          onSelecting={handleSelecting}
          slotPropGetter={slotPropGetter}
          selectable
          eventPropGetter={() => ({ style: { backgroundColor: "#C0392B" } })}
          culture="en-US"
          style={{ height: 500 }}
          components={{ toolbar: CustomToolbar }}
        />
      </div>

      <div className="card">
        <h3 className="font-medium mb-4">Buat booking baru</h3>

        {error && (
          <p className="text-danger text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
            {rateLimitLeft > 0 && (
              <span className="block mt-1 font-medium">
                Silakan coba lagi dalam {rateLimitLeft} detik.
              </span>
            )}
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
            <DatePicker
              selected={startTime}
              onChange={(d: Date | null) => d && setStartTime(d)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={30}
              timeFormat="HH:mm"
              dateFormat="HH:mm"
              locale="id"
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
          disabled={isBlocked}
          className="btn-primary mt-5"
        >
          {submitting
            ? "Memproses..."
            : redirecting
            ? "Mengalihkan ke pembayaran..."
            : rateLimitLeft > 0
            ? `Coba lagi dalam ${rateLimitLeft}s`
            : "Booking ruangan ini"}
        </button>
      </div>
    </div>
  );
}
