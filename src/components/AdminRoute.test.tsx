import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRoute } from "./AdminRoute";
import type { User } from "../api/client";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";

const useAuthMock = vi.mocked(useAuth);

const adminUser: User = {
  id: "u1",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
};

const regularUser: User = {
  id: "u2",
  name: "Budi",
  email: "budi@example.com",
  role: "user",
};

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={["/admin/resources"]}>
      <Routes>
        <Route
          path="/admin/resources"
          element={
            <AdminRoute>
              <div>Admin Resources Content</div>
            </AdminRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("menampilkan indikator loading dan tidak merender children saat auth sedang dipulihkan", () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAdmin();

    expect(screen.getByText("Memuat...")).toBeInTheDocument();
    expect(screen.queryByText("Admin Resources Content")).not.toBeInTheDocument();
  });

  it("mengalihkan user yang belum login ke /login dan tidak merender children", () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAdmin();

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Resources Content")).not.toBeInTheDocument();
  });

  it("mengalihkan user dengan role user ke / dan tidak merender children", () => {
    useAuthMock.mockReturnValue({
      user: regularUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAdmin();

    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Resources Content")).not.toBeInTheDocument();
  });

  it("merender children untuk user dengan role admin", () => {
    useAuthMock.mockReturnValue({
      user: adminUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderAdmin();

    expect(screen.getByText("Admin Resources Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });
});
