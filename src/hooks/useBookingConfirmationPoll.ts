import { useEffect, useRef, useState } from "react";
import { bookingApi, type Booking } from "../api/client";

const INTERVAL_MS = 2500;
const SAFETY_MS = 16 * 60 * 1000;

export type PollStatus =
  | "loading"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "expired";

export function useBookingConfirmationPoll(bookingId: string | null) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState<PollStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function check() {
      try {
        const bookings = await bookingApi.listMine();
        if (cancelled) return;
        const found = bookings.find((b) => b.id === bookingId) ?? null;
        setBooking(found);
        if (!found) {
          setStatus("loading");
          return;
        }
        if (found.status === "confirmed") {
          setStatus("confirmed");
          if (timer) clearInterval(timer);
        } else if (found.status === "cancelled") {
          setStatus("cancelled");
          if (timer) clearInterval(timer);
        } else {
          const expired =
            found.payment?.expiresAt != null &&
            new Date(found.payment.expiresAt).getTime() <= Date.now();
          if (expired) {
            setStatus("expired");
            if (timer) clearInterval(timer);
          } else {
            setStatus("pending");
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Gagal memuat status booking");
      } finally {
        if (
          !cancelled &&
          Date.now() - startRef.current > SAFETY_MS &&
          timer
        ) {
          clearInterval(timer);
          setStatus((s) => (s === "loading" || s === "pending" ? "expired" : s));
        }
      }
    }

    check();
    timer = setInterval(check, INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [bookingId]);

  return { booking, status, error };
}
