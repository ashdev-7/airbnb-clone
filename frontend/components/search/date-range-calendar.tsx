"use client";

import { DayPicker } from "react-day-picker";
import {
  fromLocalDate,
  isSelectableCheckIn,
  isSelectableCheckOut,
  lastBookableDay,
  selectDay,
  toLocalDate,
  today,
  type DateSelection,
  type Stay,
} from "@/lib/dates";

type Props = {
  value: DateSelection;
  onChange: (value: DateSelection) => void;
  /** Stays already booked; their nights cannot be chosen (plan §10.2). */
  booked?: readonly Stay[];
  months?: 1 | 2;
};

const CELL = "size-[51.5px]";

/*
 * Measured from capture A4: 51.5 px cells, 2 px between weeks, 16 px medium month names
 * in a 64 px band, 12 px grey weekday initials, 14 px medium day numbers; a chosen day is
 * a dark disc with white text; a day that cannot be chosen is grey. The tint between the
 * two ends of a range is ours: A4 shows a single chosen day.
 */
const CLASS_NAMES = {
  root: "relative",
  months: "flex justify-center gap-[54px]",
  month: "w-[360.5px]",
  month_caption: "flex h-16 items-center justify-center",
  caption_label: "text-base leading-5 font-medium",
  nav: "pointer-events-none absolute inset-x-0 top-0 z-[1] flex h-16 items-center justify-between",
  button_previous:
    "pointer-events-auto flex size-8 items-center justify-center rounded-full hover:bg-control disabled:opacity-30",
  button_next:
    "pointer-events-auto flex size-8 items-center justify-center rounded-full hover:bg-control disabled:opacity-30",
  chevron: "size-3 fill-current",
  month_grid: "border-separate border-spacing-x-0 border-spacing-y-[2px]",
  weekday: "h-[28px] w-[51.5px] pb-[11px] text-xs leading-[17px] font-medium text-muted",
  day: `${CELL} p-0 text-center`,
  day_button: `${CELL} rounded-full border border-transparent text-sm font-medium enabled:hover:border-ink`,
  disabled: "text-faint [&>button]:cursor-not-allowed",
  hidden: "invisible",
  range_start: "rounded-l-full bg-surface [&>button]:bg-ink [&>button]:text-white",
  range_end: "rounded-r-full bg-surface [&>button]:bg-ink [&>button]:text-white",
  range_middle: "bg-surface",
  selected: "",
};

/**
 * A check-in / check-out picker. react-day-picker draws the months and handles the
 * keyboard; which days may be chosen, and what a click means, come from lib/dates.ts.
 */
export function DateRangeCalendar({ value, onChange, booked = [], months = 2 }: Props) {
  const todayDate = today();
  const { checkIn, checkOut } = value;
  const choosingCheckOut = checkIn !== null && checkOut === null;

  const selectable = (day: string) =>
    choosingCheckOut && day > checkIn
      ? isSelectableCheckOut(day, checkIn, todayDate, booked)
      : isSelectableCheckIn(day, todayDate, booked);

  return (
    <DayPicker
      mode="range"
      numberOfMonths={months}
      weekStartsOn={0}
      today={toLocalDate(todayDate)}
      defaultMonth={toLocalDate(checkIn ?? todayDate)}
      startMonth={toLocalDate(todayDate)}
      endMonth={toLocalDate(lastBookableDay(todayDate))}
      selected={
        checkIn
          ? { from: toLocalDate(checkIn), to: checkOut ? toLocalDate(checkOut) : toLocalDate(checkIn) }
          : undefined
      }
      onSelect={(_range, clicked) => onChange(selectDay(value, fromLocalDate(clicked)))}
      disabled={(date) => !selectable(fromLocalDate(date))}
      formatters={{
        formatWeekdayName: (date) => date.toLocaleDateString("en-IN", { weekday: "narrow" }),
      }}
      classNames={CLASS_NAMES}
    />
  );
}
