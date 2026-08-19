import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";

const useAuthMock = vi.mocked(useAuth);

function authValue(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RegisterPage", () => {
  beforeEach(() => useAuthMock.mockReset());

  it("menampilkan form nama, email, dan password", () => {
    useAuthMock.mockReturnValue(authValue());

    renderRegister();

    expect(screen.getByPlaceholderText("Nama lengkap")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("kamu@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Minimal 8 karakter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daftar" })).toBeInTheDocument();
  });

  it("registrasi sukses memanggil register dan mengarahkan ke halaman utama", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(authValue({ register }));
    const user = userEvent.setup();

    renderRegister();

    await user.type(screen.getByPlaceholderText("Nama lengkap"), "Budi");
    await user.type(screen.getByPlaceholderText("kamu@email.com"), "budi@example.com");
    await user.type(screen.getByPlaceholderText("Minimal 8 karakter"), "rahasia123");
    await user.click(screen.getByRole("button", { name: "Daftar" }));

    expect(await screen.findByText("Home Page")).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith(
      "Budi",
      "budi@example.com",
      "rahasia123"
    );
  });

  it("registrasi gagal menampilkan pesan error dari backend", async () => {
    const register = vi
      .fn()
      .mockRejectedValue(new Error("Email sudah terdaftar"));
    useAuthMock.mockReturnValue(authValue({ register }));
    const user = userEvent.setup();

    renderRegister();

    await user.type(screen.getByPlaceholderText("Nama lengkap"), "Budi");
    await user.type(screen.getByPlaceholderText("kamu@email.com"), "budi@example.com");
    await user.type(screen.getByPlaceholderText("Minimal 8 karakter"), "rahasia123");
    await user.click(screen.getByRole("button", { name: "Daftar" }));

    expect(await screen.findByText("Email sudah terdaftar")).toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });
});