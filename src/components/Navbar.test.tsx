import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "./Navbar";
import type { User } from "../api/client";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";

const useAuthMock = vi.mocked(useAuth);

const user: User = {
  id: "u1",
  name: "Budi",
  email: "budi@example.com",
  role: "user",
};

const admin: User = {
  id: "a1",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
};

function renderNavbar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<Navbar />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/admin/resources"
          element={<div>Kelola Ruangan Page</div>}
        />
        <Route
          path="/admin/bookings"
          element={<div>Kelola Booking Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("menampilkan tautan masuk dan daftar saat belum login", () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.getByText("RoomBook")).toBeInTheDocument();
    expect(screen.getByText("Masuk")).toBeInTheDocument();
    expect(screen.getByText("Daftar")).toBeInTheDocument();
    expect(screen.queryByText("Keluar")).not.toBeInTheDocument();
  });

  it("menampilkan tautan navigasi, nama user, dan tombol keluar saat login", () => {
    useAuthMock.mockReturnValue({
      user,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.getByText("Ruangan")).toBeInTheDocument();
    expect(screen.getByText("Booking Saya")).toBeInTheDocument();
    expect(screen.getByText("Hai, Budi")).toBeInTheDocument();
    expect(screen.getByText("Keluar")).toBeInTheDocument();
    expect(screen.queryByText("Masuk")).not.toBeInTheDocument();
  });

  it("logout memanggil logout dan mengarahkan ke /login", () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue({
      user,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });

    renderNavbar();

    fireEvent.click(screen.getByText("Keluar"));

    expect(logout).toHaveBeenCalled();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  describe("dropdown admin", () => {
    function setupAdmin() {
      useAuthMock.mockReturnValue({
        user: admin,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });
      renderNavbar();
    }

    it("tidak menampilkan tombol admin untuk user non-admin", () => {
      useAuthMock.mockReturnValue({
        user,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      renderNavbar();

      expect(screen.queryByRole("button", { name: /Admin/ })).not.toBeInTheDocument();
      expect(screen.queryByText("Kelola Ruangan")).not.toBeInTheDocument();
    });

    it("menampilkan tombol admin tapi menu tertutup saat awal render", () => {
      setupAdmin();

      const toggle = screen.getByRole("button", { name: /Admin/ });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Kelola Ruangan")).not.toBeInTheDocument();
      expect(screen.queryByText("Kelola Booking")).not.toBeInTheDocument();
    });

    it("membuka menu berisi dua item saat tombol diklik", () => {
      setupAdmin();

      fireEvent.click(screen.getByRole("button", { name: /Admin/ }));

      expect(screen.getByText("Kelola Ruangan")).toBeInTheDocument();
      expect(screen.getByText("Kelola Booking")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Admin/ })
      ).toHaveAttribute("aria-expanded", "true");
    });

    it("menavigasi ke /admin/resources dan menutup menu saat item Ruangan diklik", () => {
      setupAdmin();

      fireEvent.click(screen.getByRole("button", { name: /Admin/ }));
      fireEvent.click(screen.getByText("Kelola Ruangan"));

      expect(screen.getByText("Kelola Ruangan Page")).toBeInTheDocument();
      expect(screen.queryByText("Kelola Booking")).not.toBeInTheDocument();
    });

    it("menavigasi ke /admin/bookings dan menutup menu saat item Booking diklik", () => {
      setupAdmin();

      fireEvent.click(screen.getByRole("button", { name: /Admin/ }));
      fireEvent.click(screen.getByText("Kelola Booking"));

      expect(screen.getByText("Kelola Booking Page")).toBeInTheDocument();
      expect(screen.queryByText("Kelola Ruangan")).not.toBeInTheDocument();
    });

    it("menutup menu saat klik di luar dropdown", () => {
      setupAdmin();

      fireEvent.click(screen.getByRole("button", { name: /Admin/ }));
      expect(screen.getByText("Kelola Ruangan")).toBeInTheDocument();

      // Klik di elemen yang berada di luar container dropdown (di sini: brand "RoomBook").
      fireEvent.mouseDown(screen.getByText("RoomBook"));

      expect(screen.queryByText("Kelola Ruangan")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Admin/ })
      ).toHaveAttribute("aria-expanded", "false");
    });

    it("menutup menu saat menekan Escape", () => {
      setupAdmin();

      fireEvent.click(screen.getByRole("button", { name: /Admin/ }));
      expect(screen.getByText("Kelola Ruangan")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByText("Kelola Ruangan")).not.toBeInTheDocument();
    });
  });
});