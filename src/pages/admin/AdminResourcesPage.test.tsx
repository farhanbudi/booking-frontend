import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminResourcesPage } from "./AdminResourcesPage";
import type { Resource } from "../../api/client";

vi.mock("../../api/client", () => ({
  resourceApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { resourceApi } from "../../api/client";

const resourceMock = vi.mocked(resourceApi);

const initialResources: Resource[] = [
  {
    id: "r1",
    name: "Ruang A",
    capacity: 4,
    location: "Lantai 1",
    isActive: true,
    pricePerHour: null,
  },
  {
    id: "r2",
    name: "Ruang B",
    capacity: 10,
    location: null,
    isActive: true,
    pricePerHour: 75000,
  },
];

const createdResource: Resource = {
  id: "r3",
  name: "Ruang Test",
  capacity: 6,
  location: "Lantai 3",
  isActive: true,
  pricePerHour: null,
};

const deactivatedResource: Resource = {
  ...initialResources[0],
  isActive: false,
};

function renderAdminResources() {
  return render(<AdminResourcesPage />);
}

describe("AdminResourcesPage", () => {
  beforeEach(() => {
    resourceMock.list.mockReset();
    resourceMock.create.mockReset();
    resourceMock.update.mockReset();
    resourceMock.remove.mockReset();
  });

  it("memanggil resourceApi.list saat mount dan menampilkan resource dari mock", async () => {
    resourceMock.list.mockResolvedValue(initialResources);

    renderAdminResources();

    expect(resourceMock.list).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Ruang A")).toBeInTheDocument();
    expect(screen.getByText("Ruang B")).toBeInTheDocument();
    expect(screen.getAllByText("Aktif")).toHaveLength(2);
  });

  it("mengisi form tambah resource dan memanggil resourceApi.create dengan payload benar", async () => {
    resourceMock.list.mockResolvedValue(initialResources);
    resourceMock.create.mockResolvedValue(createdResource);
    resourceMock.list.mockResolvedValueOnce(initialResources);
    resourceMock.list.mockResolvedValueOnce([...initialResources, createdResource]);
    const user = userEvent.setup();

    renderAdminResources();

    await screen.findByText("Ruang A");

    await user.click(screen.getByRole("button", { name: /\+ Tambah ruangan/ }));
    await user.type(
      screen.getByPlaceholderText("Contoh: Ruang Meeting A"),
      "Ruang Test"
    );
    await user.type(screen.getByPlaceholderText("Minimal 1"), "6");
    await user.type(screen.getByPlaceholderText("Opsional"), "Lantai 3");

    await user.click(screen.getByRole("button", { name: "Tambah" }));

    await vi.waitFor(() =>
      expect(resourceMock.create).toHaveBeenCalledWith({
        name: "Ruang Test",
        capacity: 6,
        location: "Lantai 3",
      })
    );
  });

  it("me-refresh daftar setelah create berhasil sehingga resource baru muncul", async () => {
    resourceMock.list
      .mockResolvedValueOnce(initialResources)
      .mockResolvedValueOnce([...initialResources, createdResource]);
    resourceMock.create.mockResolvedValue(createdResource);
    const user = userEvent.setup();

    renderAdminResources();

    await screen.findByText("Ruang A");
    expect(screen.queryByText("Ruang Test")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /\+ Tambah ruangan/ }));
    await user.type(
      screen.getByPlaceholderText("Contoh: Ruang Meeting A"),
      "Ruang Test"
    );
    await user.type(screen.getByPlaceholderText("Minimal 1"), "6");
    await user.click(screen.getByRole("button", { name: "Tambah" }));

    expect(await screen.findByText("Ruang Test")).toBeInTheDocument();
    expect(resourceMock.list).toHaveBeenCalledTimes(2);
  });

  it("memanggil resourceApi.remove dengan id yang benar saat tombol Nonaktifkan diklik", async () => {
    resourceMock.list.mockResolvedValue(initialResources);
    resourceMock.remove.mockResolvedValue(deactivatedResource);
    const user = userEvent.setup();

    renderAdminResources();

    await screen.findByText("Ruang A");
    const deactivateButtons = screen.getAllByRole("button", {
      name: "Nonaktifkan",
    });
    expect(deactivateButtons).toHaveLength(2);

    await user.click(deactivateButtons[0]);

    await vi.waitFor(() =>
      expect(resourceMock.remove).toHaveBeenCalledWith("r1")
    );
  });

  it("menampilkan pesan error dari backend saat create gagal", async () => {
    resourceMock.list.mockResolvedValue(initialResources);
    resourceMock.create.mockRejectedValue(new Error("Nama ruangan sudah dipakai"));
    const user = userEvent.setup();

    renderAdminResources();

    await screen.findByText("Ruang A");
    await user.click(screen.getByRole("button", { name: /\+ Tambah ruangan/ }));
    await user.type(
      screen.getByPlaceholderText("Contoh: Ruang Meeting A"),
      "Duplikat"
    );
    await user.type(screen.getByPlaceholderText("Minimal 1"), "4");
    await user.click(screen.getByRole("button", { name: "Tambah" }));

    expect(
      await screen.findByText("Nama ruangan sudah dipakai")
    ).toBeInTheDocument();
  });

  it("menampilkan pesan error saat load daftar gagal", async () => {
    resourceMock.list.mockRejectedValue(new Error("Gagal memuat ruangan"));

    renderAdminResources();

    expect(await screen.findByText("Gagal memuat ruangan")).toBeInTheDocument();
  });
});
