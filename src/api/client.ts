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
    throw new Error(message);
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
}

export interface Booking {
  id: string;
  userId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "cancelled";
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
export const resourceApi = {
  list: () => request<Resource[]>("/resources"),
  get: (id: string) => request<Resource>(`/resources/${id}`),
};

// ---- Bookings ----
export const bookingApi = {
  availability: (resourceId: string, date: string) =>
    request<{ startTime: string; endTime: string }[]>(
      `/bookings/availability?resourceId=${resourceId}&date=${date}`
    ),

  create: (input: { resourceId: string; startTime: string; endTime: string }) =>
    request<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listMine: () => request<Booking[]>("/bookings"),

  cancel: (id: string) =>
    request<Booking>(`/bookings/${id}/cancel`, { method: "PATCH" }),
};
