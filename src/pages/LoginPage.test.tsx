import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

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

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => useAuthMock.mockReset());

  it("menampilkan form email dan password", () => {
    useAuthMock.mockReturnValue(authValue());

    renderLogin();

    expect(screen.getByPlaceholderText("kamu@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
  });

  it("login sukses memanggil login dan mengarahkan ke halaman utama", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(authValue({ login }));
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByPlaceholderText("kamu@email.com"), "budi@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "rahasia");
    await user.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByText("Home Page")).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith("budi@example.com", "rahasia");
  });

  it("login gagal menampilkan pesan error dari backend", async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new Error("Email atau password salah"));
    useAuthMock.mockReturnValue(authValue({ login }));
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByPlaceholderText("kamu@email.com"), "budi@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "salah");
    await user.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByText("Email atau password salah")).toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });

  it("tombol submit dinonaktifkan dan bertuliskan Memproses saat mengirim", async () => {
    let resolveLogin!: (v: void | PromiseLike<void>) => void;
    const login = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolveLogin = res;
        })
    );
    useAuthMock.mockReturnValue(authValue({ login }));
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByPlaceholderText("kamu@email.com"), "budi@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "rahasia");
    await user.click(screen.getByRole("button", { name: "Masuk" }));

    const submitting = screen.getByRole("button", { name: "Memproses..." });
    expect(submitting).toBeDisabled();

    await act(async () => {
      resolveLogin(undefined);
    });

    expect(await screen.findByText("Home Page")).toBeInTheDocument();
  });
});