import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceTag } from "./PriceTag";
import type { Resource } from "../api/client";

const base: Resource = {
  id: "r1",
  name: "Ruang A",
  capacity: 4,
  location: null,
  isActive: true,
  pricePerHour: null,
};

describe("PriceTag", () => {
  it("menampilkan 'Gratis' untuk harga null", () => {
    render(<PriceTag resource={{ ...base, pricePerHour: null }} />);
    expect(screen.getByText("Gratis")).toBeInTheDocument();
  });

  it("menampilkan 'Gratis' untuk harga 0", () => {
    render(<PriceTag resource={{ ...base, pricePerHour: 0 }} />);
    expect(screen.getByText("Gratis")).toBeInTheDocument();
  });

  it("menampilkan harga per jam untuk harga > 0", () => {
    render(<PriceTag resource={{ ...base, pricePerHour: 50000 }} />);
    expect(screen.getByText("Rp 50.000/jam")).toBeInTheDocument();
  });

  it("memformat harga dengan pemisah ribuan", () => {
    render(<PriceTag resource={{ ...base, pricePerHour: 125000 }} />);
    expect(screen.getByText("Rp 125.000/jam")).toBeInTheDocument();
  });
});
