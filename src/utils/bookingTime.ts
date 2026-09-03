export const MIN_HOUR = 8;
export const MAX_HOUR = 20;
export const TIME_INTERVAL_MIN = 30;

// Slot waktu opsional terakhir yang boleh dipilih sebagai startTime.
// Karena MAX_HOUR=20 bersifat eksklusif di logika kita (isWithinBookingHours:
// `totalMin < MAX_HOUR * 60`), slot 20:00 sendiri tidak valid — startTime=20:00
// akan ditolak. DatePicker maxTime adalah batas inklusif, jadi kita set ke
// MAX_HOUR dikurangi satu interval agar opsi 20:00 tidak muncul di dropdown.
export const LATEST_START_HOUR = MAX_HOUR - 1; // 19
export const LATEST_START_MINUTE = 60 - TIME_INTERVAL_MIN; // 30

export function makeTimeOfDay(hours: number, minutes = 0): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function isWithinBookingHours(date: Date): boolean {
  const totalMin = date.getHours() * 60 + date.getMinutes();
  return totalMin >= MIN_HOUR * 60 && totalMin < MAX_HOUR * 60;
}

export function exceedsBookingHours(start: Date, durationMin: number): boolean {
  const end = new Date(start.getTime() + durationMin * 60_000);
  if (end.getDate() !== start.getDate()) return true;
  // EXceed jika endTime melewati MAX_HOUR (eksklusif), dalam menit:
  // - end lewat tengah malam (sudah ditangani di atas)
  // - end lewat jam tutup, yaitu hours >= MAX_HOUR dan (minutes > 0 ATAU hours > MAX_HOUR)
  //   sehingga booking yang berakhir tepat di MAX_HOUR (mis. 19:00–20:00) tetap valid,
  //   tapi 19:00–21:00 (hours=21, minutes=0) terdeteksi.
  if (end.getHours() > MAX_HOUR) return true;
  if (end.getHours() === MAX_HOUR && end.getMinutes() > 0) return true;
  return false;
}

// Untuk react-big-calendar `min`/`max` prop, yang membatasi slot kalender yang
// ditampilkan pada hari yang sedang dilihat. RBC mengabaikan komponen tahun/bulan/tanggal
// dan hanya memakai jam-menit; kita tetap setel tanggalnya agar aman dipakai oleh RBC.
export function buildDayBoundary(
  day: Date,
  hours: number,
  minutes = 0
): Date {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// Untuk react-datepicker `filterTime` prop, menyembunyikan opsi waktu di luar
// jam operasional (08:00–20:00) sehingga tidak muncul di dropdown.
export function isTimeInOperatingRange(time: Date): boolean {
  return isWithinBookingHours(time);
}

// Mengembalikan daftar durasi (menit) dari `allDurations` yang masih muat di
// rentang operasional ketika dipakai sebagai startTime. Contoh: startTime=19:00
// + durasi 30 → end 19:30 (OK), +60 → 20:00 (OK, tepat batas), +90 → 20:30
// (exceeds), +120 → 21:00 (exceeds). Jadi yang valid hanya 30 & 60.
export function allowedDurationsFor(
  start: Date,
  allDurations: number[]
): number[] {
  return allDurations.filter((d) => !exceedsBookingHours(start, d));
}

// True jika `bookingDay` adalah hari ini (lokal) DAN `startTime` (jam-menit)
// sudah lewat dari waktu sekarang (real-time). Hanya validasi; tidak menyembunyikan
// opsi apa pun — biar UI tetap menampilkan semua opsi, hanya flag error yang aktif.
export function isStartTimeInPast(bookingDay: Date, startTime: Date): boolean {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(bookingDay);
  dayStart.setHours(0, 0, 0, 0);
  if (dayStart.getTime() !== today.getTime()) return false;

  // Bangun datetime absolut dari bookingDay + startTime
  const startAbs = new Date(
    bookingDay.getFullYear(),
    bookingDay.getMonth(),
    bookingDay.getDate(),
    startTime.getHours(),
    startTime.getMinutes(),
    0,
    0
  );
  return startAbs.getTime() < now.getTime();
}