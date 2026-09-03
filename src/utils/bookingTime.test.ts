import { describe, expect, it } from "vitest";
import {
  allowedDurationsFor,
  buildDayBoundary,
  exceedsBookingHours,
  isStartTimeInPast,
  isTimeInOperatingRange,
  isWithinBookingHours,
  LATEST_START_HOUR,
  LATEST_START_MINUTE,
  makeTimeOfDay,
  MAX_HOUR,
  MIN_HOUR,
  TIME_INTERVAL_MIN,
} from "./bookingTime";

function at(hours: number, minutes = 0): Date {
  return makeTimeOfDay(hours, minutes);
}

function dayAt(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

describe("bookingTime helpers", () => {
  describe("MIN_HOUR / MAX_HOUR", () => {
    it("mendefinisikan batas operasional 08:00–20:00", () => {
      expect(MIN_HOUR).toBe(8);
      expect(MAX_HOUR).toBe(20);
    });
  });

  describe("LATEST_START_HOUR / LATEST_START_MINUTE", () => {
    it("mengikuti TIME_INTERVAL_MIN sehingga slot MAX_HOUR tidak muncul di DatePicker", () => {
      expect(TIME_INTERVAL_MIN).toBe(30);
      // MAX_HOUR eksklusif di logika; maxTime DatePicker inklusif sehingga
      // batas maxTime-nya adalah satu interval sebelum MAX_HOUR.
      expect(LATEST_START_HOUR).toBe(MAX_HOUR - 1); // 19
      expect(LATEST_START_MINUTE).toBe(60 - TIME_INTERVAL_MIN); // 30
    });

    it("LATEST_START = 19:30 tetap dalam rentang isWithinBookingHours", () => {
      expect(isWithinBookingHours(at(LATEST_START_HOUR, LATEST_START_MINUTE))).toBe(true);
    });

    it("MAX_HOUR=20 tidak termasuk isWithinBookingHours (eksklusif)", () => {
      expect(isWithinBookingHours(at(MAX_HOUR, 0))).toBe(false);
    });
  });

  describe("makeTimeOfDay", () => {
    it("mengembalikan Date dengan jam-menit yang ditentukan", () => {
      const d = makeTimeOfDay(9, 30);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(30);
      expect(d.getSeconds()).toBe(0);
      expect(d.getMilliseconds()).toBe(0);
    });

    it("default menit adalah 0", () => {
      const d = makeTimeOfDay(14);
      expect(d.getMinutes()).toBe(0);
    });
  });

  describe("isWithinBookingHours", () => {
    it("menerima jam tepat di batas bawah (08:00)", () => {
      expect(isWithinBookingHours(at(8, 0))).toBe(true);
    });

    it("menolak jam satu menit sebelum batas bawah (07:59)", () => {
      expect(isWithinBookingHours(at(7, 59))).toBe(false);
    });

    it("menolak jam 07:00", () => {
      expect(isWithinBookingHours(at(7, 0))).toBe(false);
    });

    it("menerima jam tengah (12:00, 15:30)", () => {
      expect(isWithinBookingHours(at(12, 0))).toBe(true);
      expect(isWithinBookingHours(at(15, 30))).toBe(true);
    });

    it("menerima 19:59 (satu menit sebelum batas atas eksklusif)", () => {
      expect(isWithinBookingHours(at(19, 59))).toBe(true);
    });

    it("menolak tepat jam 20:00 karena batas atas eksklusif", () => {
      expect(isWithinBookingHours(at(20, 0))).toBe(false);
    });

    it("menolak jam malam (21:00, 23:00)", () => {
      expect(isWithinBookingHours(at(21, 0))).toBe(false);
      expect(isWithinBookingHours(at(23, 0))).toBe(false);
    });
  });

  describe("exceedsBookingHours", () => {
    it("tidak exceed untuk booking pendek dalam rentang", () => {
      expect(exceedsBookingHours(at(9, 0), 60)).toBe(false);
      expect(exceedsBookingHours(at(10, 0), 120)).toBe(false);
    });

    it("tidak exceed untuk start 19:00 + 60 menit = 20:00 (tepat di batas)", () => {
      expect(exceedsBookingHours(at(19, 0), 60)).toBe(false);
    });

    it("exceed untuk start 19:00 + 90 menit = 20:30", () => {
      expect(exceedsBookingHours(at(19, 0), 90)).toBe(true);
    });

    it("exceed untuk start 19:30 + 60 menit = 20:30", () => {
      expect(exceedsBookingHours(at(19, 30), 60)).toBe(true);
    });

    it("exceed untuk start 20:00 + 30 menit (lintas hari)", () => {
      const start = at(20, 0);
      expect(exceedsBookingHours(start, 30)).toBe(true);
    });
  });

  describe("buildDayBoundary", () => {
    it("membangun Date pada tanggal yang diberikan dengan jam-menit yang ditentukan", () => {
      const day = new Date(2026, 8, 3); // 3 September 2026
      const result = buildDayBoundary(day, MIN_HOUR, 0);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(8);
      expect(result.getDate()).toBe(3);
      expect(result.getHours()).toBe(8);
      expect(result.getMinutes()).toBe(0);
    });

    it("default menit adalah 0", () => {
      const day = new Date(2026, 8, 3);
      const result = buildDayBoundary(day, MAX_HOUR);
      expect(result.getHours()).toBe(20);
      expect(result.getMinutes()).toBe(0);
    });

    it("tidak memutasi tanggal input", () => {
      const day = new Date(2026, 8, 3, 12, 30);
      buildDayBoundary(day, MIN_HOUR, 0);
      expect(day.getHours()).toBe(12);
      expect(day.getMinutes()).toBe(30);
    });
  });

  describe("isTimeInOperatingRange (filterTime DatePicker)", () => {
    it("menerima waktu di dalam rentang", () => {
      expect(isTimeInOperatingRange(at(8, 0))).toBe(true);
      expect(isTimeInOperatingRange(at(12, 0))).toBe(true);
      expect(isTimeInOperatingRange(at(19, 30))).toBe(true);
    });

    it("menolak waktu sebelum 08:00", () => {
      expect(isTimeInOperatingRange(at(0, 0))).toBe(false);
      expect(isTimeInOperatingRange(at(7, 0))).toBe(false);
      expect(isTimeInOperatingRange(at(7, 59))).toBe(false);
    });

    it("menolak waktu 20:00 ke atas (batas atas eksklusif)", () => {
      expect(isTimeInOperatingRange(at(20, 0))).toBe(false);
      expect(isTimeInOperatingRange(at(23, 0))).toBe(false);
    });
  });

  describe("allowedDurationsFor", () => {
    const all = [30, 60, 90, 120];

    it("untuk start 09:00 (di tengah rentang), semua durasi valid", () => {
      expect(allowedDurationsFor(at(9, 0), all)).toEqual([30, 60, 90, 120]);
    });

    it("untuk start 18:00, semua durasi valid (end max 20:00, tetap OK)", () => {
      expect(allowedDurationsFor(at(18, 0), all)).toEqual([30, 60, 90, 120]);
    });

    it("untuk start 19:00, hanya 30 & 60 yang valid (90 → 20:30, 120 → 21:00 exceed)", () => {
      expect(allowedDurationsFor(at(19, 0), all)).toEqual([30, 60]);
    });

    it("untuk start 19:30, hanya 30 yang valid (60 → 20:30 exceed)", () => {
      expect(allowedDurationsFor(at(19, 30), all)).toEqual([30]);
    });

    it("untuk start LATEST_START (19:30), hanya 30 yang valid", () => {
      expect(allowedDurationsFor(at(LATEST_START_HOUR, LATEST_START_MINUTE), all)).toEqual([30]);
    });

    it("mengembalikan array kosong jika tidak ada durasi yang muat", () => {
      expect(allowedDurationsFor(at(19, 30), [60, 90, 120])).toEqual([]);
    });
  });

  describe("isStartTimeInPast", () => {
    it("mengembalikan false jika bookingDay bukan hari ini", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      // startTime 00:00 selalu lebih awal dari "sekarang" tapi bookingDay besok → tidak applicable
      expect(isStartTimeInPast(tomorrow, at(0, 0))).toBe(false);
    });

    it("mengembalikan true jika bookingDay hari ini dan startTime < waktu sekarang", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const past = new Date();
      past.setHours(0, 0, 0, 0); // 00:00 hari ini — selalu < "sekarang" kecuali test jalan tepat jam 00:00
      expect(isStartTimeInPast(today, past)).toBe(true);
    });

    it("mengembalikan false jika bookingDay hari ini dan startTime di masa depan (1 jam dari sekarang)", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const future = new Date();
      future.setHours(future.getHours() + 1, 0, 0, 0);
      expect(isStartTimeInPast(today, future)).toBe(false);
    });

    it("memperlakukan tahun berbeda (hanya hari ini yang relevan)", () => {
      const farFuture = dayAt(2099, 0, 1);
      expect(isStartTimeInPast(farFuture, at(0, 0))).toBe(false);
    });
  });
});