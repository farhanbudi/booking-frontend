import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Navigate } from "react-big-calendar";
import { CustomToolbar } from "./CalendarToolbar";

const today = new Date("2026-09-02T10:00:00.000Z");

function renderToolbar(overrides: Partial<React.ComponentProps<typeof CustomToolbar>> = {}) {
  const onNavigate = vi.fn();
  const onView = vi.fn();
  const onPickerOpenChange = vi.fn();
  const utils = render(
    <CustomToolbar
      date={today}
      onNavigate={onNavigate}
      onView={onView}
      onPickerOpenChange={onPickerOpenChange}
      view="day"
      views={["day"]}
      label="2 September 2026"
      localizer={{} as any}
      {...overrides}
    />
  );
  return { ...utils, onNavigate, onView, onPickerOpenChange };
}

describe("CustomToolbar", () => {
  describe("tombol navigasi", () => {
    it("merender tiga tombol navigasi dengan label Bahasa Indonesia", () => {
      renderToolbar();

      expect(screen.getByRole("button", { name: /Sebelumnya/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Hari ini/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Berikutnya/ })).toBeInTheDocument();
    });

    it("memanggil onNavigate dengan Navigate.PREVIOUS saat tombol Sebelumnya diklik", async () => {
      const user = userEvent.setup();
      const { onNavigate } = renderToolbar();

      await user.click(screen.getByRole("button", { name: /Sebelumnya/ }));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(Navigate.PREVIOUS);
    });

    it("memanggil onNavigate dengan Navigate.TODAY saat tombol Hari ini diklik", async () => {
      const user = userEvent.setup();
      const { onNavigate } = renderToolbar();

      await user.click(screen.getByRole("button", { name: /Hari ini/ }));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(Navigate.TODAY);
    });

    it("memanggil onNavigate dengan Navigate.NEXT saat tombol Berikutnya diklik", async () => {
      const user = userEvent.setup();
      const { onNavigate } = renderToolbar();

      await user.click(screen.getByRole("button", { name: /Berikutnya/ }));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(Navigate.NEXT);
    });
  });

  describe("DatePicker", () => {
    it("merender input DatePicker dengan format tanggal Bahasa Indonesia", () => {
      renderToolbar();

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toMatch(/September/);
      expect(input.value).toMatch(/2026/);
    });

    it("memanggil onPickerOpenChange(true) saat DatePicker dibuka", async () => {
      const user = userEvent.setup();
      const { onPickerOpenChange } = renderToolbar();

      await user.click(screen.getByRole("textbox"));

      expect(onPickerOpenChange).toHaveBeenCalledWith(true);
    });

    it("memanggil onPickerOpenChange(false) saat DatePicker ditutup", async () => {
      const user = userEvent.setup();
      const { onPickerOpenChange } = renderToolbar();

      const input = screen.getByRole("textbox");
      await user.click(input);
      expect(onPickerOpenChange).toHaveBeenCalledWith(true);

      // Tekan Escape menutup DatePicker; library memanggil onCalendarClose.
      await user.keyboard("{Escape}");

      expect(onPickerOpenChange).toHaveBeenCalledWith(false);
    });

    it("tidak crash ketika onPickerOpenChange tidak diberikan", async () => {
      const user = userEvent.setup();
      render(
        <CustomToolbar
          date={today}
          onNavigate={vi.fn()}
          onView={vi.fn()}
          view="day"
          views={["day"]}
          label="2 September 2026"
          localizer={{} as any}
        />
      );

      await expect(user.click(screen.getByRole("textbox"))).resolves.not.toThrow();
    });

    it("memanggil onNavigate dengan Navigate.DATE dan tanggal baru saat tanggal dipilih", async () => {
      const user = userEvent.setup();
      const { onNavigate } = renderToolbar();

      const input = screen.getByRole("textbox");
      await user.click(input);

      // Tunggu DatePicker portal muncul, lalu klik day cell untuk tanggal 15.
      await screen.findByRole("dialog", { name: /Choose Date/ });
      const day15 = document.querySelector<HTMLDivElement>(
        '.react-datepicker__day:not(.react-datepicker__day--outside):not(.react-datepicker__day--disabled)'
      );
      expect(day15).not.toBeNull();
      if (day15) {
        await user.click(day15);
      }

      // Cari panggilan onNavigate dengan Navigate.DATE.
      const dateCall = onNavigate.mock.calls.find((c) => c[0] === Navigate.DATE);
      expect(dateCall).toBeDefined();
      expect(dateCall![1]).toBeInstanceOf(Date);
    });
  });
});
