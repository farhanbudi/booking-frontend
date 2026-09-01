const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function getToken() {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error ?? `Request gagal (status ${res.status})`;
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
    const { token } = await request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    localStorage.setItem("token", token);
    return token;
  },

  me: () => request<User>("/auth/me"),

  logout: () => localStorage.removeItem("token"),
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
