import DatePicker, { registerLocale } from "react-datepicker";
import { id } from "date-fns/locale";
import { ToolbarProps, Navigate } from "react-big-calendar";
import type { CalendarEvent } from "../api/client";

registerLocale("id", id);

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

interface CustomToolbarProps extends ToolbarProps<CalendarEvent, object> {
  onPickerOpenChange?: (open: boolean) => void;
}

export function CustomToolbar({ date, onNavigate, onPickerOpenChange }: CustomToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onNavigate(Navigate.PREVIOUS)}
          className="flex items-center gap-1 border rounded px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          <IconChevronLeft />
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onNavigate(Navigate.TODAY)}
          className="border rounded px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
        >
          Hari ini
        </button>
        <button
          type="button"
          onClick={() => onNavigate(Navigate.NEXT)}
          className="flex items-center gap-1 border rounded px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          Berikutnya
          <IconChevronRight />
        </button>
      </div>

      <DatePicker
        selected={date}
        onChange={(newDate: Date | null) => {
          if (newDate) onNavigate(Navigate.DATE, newDate);
        }}
        onCalendarOpen={() => onPickerOpenChange?.(true)}
        onCalendarClose={() => onPickerOpenChange?.(false)}
        minDate={new Date()}
        dateFormat="EEEE, d MMMM yyyy"
        locale="id"
        className="border rounded px-3 py-1.5 text-sm w-56"
        calendarStartDay={1}
        popperPlacement="bottom-end"
      />
    </div>
  );
}