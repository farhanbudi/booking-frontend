import { logger } from "../utils/logger";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("token");
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("Tidak ada refresh token tersimpan");
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      throw new Error("Refresh token tidak valid atau sudah expired");
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

type AuthExpiredListener = () => void;
const authExpiredListeners: AuthExpiredListener[] = [];

export function onAuthExpired(listener: AuthExpiredListener) {
  authExpiredListeners.push(listener);
  return () => {
    const idx = authExpiredListeners.indexOf(listener);
    if (idx >= 0) authExpiredListeners.splice(idx, 1);
  };
}

function notifyAuthExpired() {
  clearTokens();
  authExpiredListeners.forEach((fn) => fn());
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isAuthEndpoint =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/refresh");

  if (res.status === 401 && !isAuthEndpoint && !_isRetry) {
    try {
      await refreshAccessToken();
      return request<T>(path, options, true);
    } catch {
      notifyAuthExpired();
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error ?? `Request gagal (status ${res.status})`;
    logger.warn("API request gagal", {
      path,
      status: res.status,
      message,
    });
    const err = new Error(message) as Error & {
      status?: number;
      retryAfter?: number;
    };
    err.status = res.status;
    const retryAfter = res.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds)) err.retryAfter = seconds;
    }
    throw err;
  }

  return data as T;
}

// ---- Types ----
export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

export interface Resource {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  isActive: boolean;
  pricePerHour: number | null;
}

export interface PaymentInfo {
  checkoutUrl?: string;
  expiresAt?: string;
}

export interface Booking {
  id: string;
  userId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "cancelled";
  payment?: PaymentInfo;
}

// Booking untuk detail yang lebih lengkap: sudah memuat relasi
// `user` (name) dan `resource` (name, location) untuk tampilan read-only.
export interface DetailBooking extends Booking {
  user: { name: string };
  resource: { name: string; location: string | null };
}

// Free booking -> Booking directly. Paid booking -> wrapped with payment.
export type CreateBookingResponse =
  | Booking
  | { booking: Booking; payment: Required<PaymentInfo> };

// ---- Helpers ----
export function isPaidResource(resource: Resource | null | undefined): boolean {
  return (
    !!resource &&
    typeof resource.pricePerHour === "number" &&
    resource.pricePerHour > 0
  );
}

export function isPaidCreate(
  resp: CreateBookingResponse
): resp is { booking: Booking; payment: Required<PaymentInfo> } {
  return (resp as { payment?: unknown }).payment != null;
}

export function formatIDR(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export function redirectToCheckout(url: string): void {
  window.location.href = url;
}

// ---- Auth ----
export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: async (input: { email: string; password: string }) => {
    const data = await request<{ accessToken: string; refreshToken: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(input) }
    );
    setTokens(data.accessToken, data.refreshToken);
  },

  me: () => request<User>("/auth/me"),

  logout: async () => {
    const refreshToken = getRefreshToken();
    clearTokens();

    if (refreshToken) {
      try {
        await request("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Logout di backend gagal (misal offline) TIDAK APA-APA — user tetap
        // ter-logout secara lokal karena token sudah dihapus di atas. JANGAN
        // lempar error dari sini, JANGAN blok proses logout gara-gara ini.
      }
    }
  },
};

// ---- Resources ----
export interface CreateResourceInput {
  name: string;
  capacity: number;
  location?: string;
  pricePerHour?: number;
}

export type UpdateResourceInput = Partial<CreateResourceInput>;

export const resourceApi = {
  list: () => request<Resource[]>("/resources"),
  get: (id: string) => request<Resource>(`/resources/${id}`),

  create: (input: CreateResourceInput) =>
    request<Resource>("/resources", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateResourceInput) =>
    request<Resource>(`/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<Resource>(`/resources/${id}`, { method: "DELETE" }),
};

// ---- Bookings ----
export const bookingApi = {
  availability: (resourceId: string, date: string) =>
    request<{ startTime: string; endTime: string }[]>(
      `/bookings/availability?resourceId=${resourceId}&date=${date}`
    ),

  create: (input: { resourceId: string; startTime: string; endTime: string }) =>
    request<CreateBookingResponse>("/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listMine: () => request<DetailBooking[]>("/bookings"),

  listAll: () => request<DetailBooking[]>("/bookings/admin/all"),

  getCheckoutUrl: (id: string) =>
    request<{ booking: Booking; payment: Required<PaymentInfo> }>(
      `/bookings/${id}/checkout-url`
    ),

  cancel: (id: string) =>
    request<Booking>(`/bookings/${id}/cancel`, { method: "PATCH" }),
};

// ---- Calendar ----
export interface CalendarEvent {
  start: Date;
  end: Date;
  title?: string;
  // tambahkan field lain sesuai calendarEvents kamu (id, resource, dll)
}