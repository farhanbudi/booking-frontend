import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourcesPage } from "./ResourcesPage";
import type { Resource } from "../api/client";

vi.mock("../api/client", () => ({
  resourceApi: { list: vi.fn(), get: vi.fn() },
}));

import { resourceApi } from "../api/client";

const resourceMock = vi.mocked(resourceApi);

const resources: Resource[] = [
  {
    id: "r1",
    name: "Ruang A",
    capacity: 4,
    location: "Lantai 1",
    isActive: true,
  },
  {
    id: "r2",
    name: "Ruang B",
    capacity: 10,
    location: null,
    isActive: true,
  },
];

function renderResources() {
  return render(
    <MemoryRouter>
      <ResourcesPage />
    </MemoryRouter>
  );
}

describe("ResourcesPage", () => {
  beforeEach(() => {
    resourceMock.list.mockReset();
    resourceMock.get.mockReset();
  });

  it("menampilkan indikator loading saat mengambil data", () => {
    resourceMock.list.mockReturnValue(new Promise(() => {}));

    renderResources();

    expect(screen.getByText("Memuat daftar ruangan...")).toBeInTheDocument();
  });

  it("menampilkan daftar ruangan sebagai tautan ke halaman booking", async () => {
    resourceMock.list.mockResolvedValue(resources);

    renderResources();

    expect(await screen.findByText("Ruang A")).toBeInTheDocument();
    expect(screen.getByText("Kapasitas 4 orang · Lantai 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ruang A/ })).toHaveAttribute(
      "href",
      "/resources/r1"
    );
    expect(screen.getByRole("link", { name: /Ruang B/ })).toHaveAttribute(
      "href",
      "/resources/r2"
    );
  });

  it("menampilkan pesan state kosong saat tidak ada ruangan", async () => {
    resourceMock.list.mockResolvedValue([]);

    renderResources();

    expect(
      await screen.findByText("Belum ada ruangan yang tersedia saat ini.")
    ).toBeInTheDocument();
  });

  it("menampilkan pesan error saat pengambilan gagal", async () => {
    resourceMock.list.mockRejectedValue(new Error("Gagal mengambil ruangan"));

    renderResources();

    expect(
      await screen.findByText("Gagal mengambil ruangan")
    ).toBeInTheDocument();
  });
});