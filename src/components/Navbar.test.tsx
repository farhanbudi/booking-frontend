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

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Navbar />} />
        <Route path="/login" element={<div>Login Page</div>} />
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
});