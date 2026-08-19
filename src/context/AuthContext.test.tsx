import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { authApi, type User } from "../api/client";

vi.mock("../api/client", () => ({
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

const authMock = vi.mocked(authApi);

const me: User = {
  id: "u1",
  name: "Budi",
  email: "budi@example.com",
  role: "user",
};

function Probe() {
  const { user, loading, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <button onClick={() => login("budi@example.com", "rahasia")}>login</button>
      <button onClick={() => register("Budi", "budi@example.com", "rahasia")}>
        register
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("memulihkan user dari token saat mount dan selesai loading", async () => {
    localStorage.setItem("token", "tok123");
    authMock.me.mockResolvedValue(me);

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("budi@example.com");
  });

  it("menghapus token dan user tetap null saat /auth/me gagal", async () => {
    localStorage.setItem("token", "tok-invalid");
    authMock.me.mockRejectedValue(new Error("Unauthorized"));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("login menyimpan token, memanggil /auth/me, dan mengeset user", async () => {
    authMock.login.mockResolvedValue("tok123");
    authMock.me.mockResolvedValue(me);

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    fireEvent.click(screen.getByText("login"));

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("budi@example.com")
    );
    expect(authMock.login).toHaveBeenCalledWith({
      email: "budi@example.com",
      password: "rahasia",
    });
  });

  it("register membuat akun lalu login sehingga user ter-set", async () => {
    authMock.register.mockResolvedValue(me);
    authMock.login.mockResolvedValue("tok123");
    authMock.me.mockResolvedValue(me);

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    fireEvent.click(screen.getByText("register"));

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("budi@example.com")
    );
    expect(authMock.register).toHaveBeenCalledWith({
      name: "Budi",
      email: "budi@example.com",
      password: "rahasia",
    });
  });

  it("logout menghapus token dan mengosongkan user", async () => {
    authMock.login.mockResolvedValue("tok123");
    authMock.me.mockResolvedValue(me);

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    fireEvent.click(screen.getByText("login"));
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("budi@example.com")
    );

    fireEvent.click(screen.getByText("logout"));

    expect(authMock.logout).toHaveBeenCalled();
    expect(screen.getByTestId("user").textContent).toBe("null");
  });
});