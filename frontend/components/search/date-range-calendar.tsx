"use client";

import { DayPicker } from "react-day-picker";
import { useNarrow } from "@/hooks/use-narrow";
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
  /** "search": the 51.5 px cells of capture A4. "listing": the 44 px cells of C1 and C4. */
  size?: "search" | "listing";
};

/*
 * Measured from capture A4: 51.5 px cells, 2 px between weeks, 16 px medium month names
 * in a 64 px band, 12 px grey weekday initials, 14 px medium day numbers; a chosen day is
 * a dark disc with white text; a day that cannot be chosen is grey. The tint between the
 * two ends of a range is ours: A4 shows a single chosen day.
 */
const SHARED = {
  root: "relative",
  month_caption: "flex h-16 items-center justify-center",
  caption_label: "text-base leading-5 font-medium",
  nav: "pointer-events-none absolute inset-x-0 top-0 z-[1] flex h-16 items-center justify-between",
  button_previous:
    "pointer-events-auto flex size-8 items-center justify-center rounded-full hover:bg-control disabled:opacity-30",
  button_next:
    "pointer-events-auto flex size-8 items-center justify-center rounded-full hover:bg-control disabled:opacity-30",
  chevron: "size-3 fill-current",
  month_grid: "border-separate border-spacing-x-0 border-spacing-y-[2px]",
  hidden: "invisible",
  range_start: "rounded-l-full bg-surface [&>button]:bg-ink [&>button]:text-paper",
  range_end: "rounded-r-full bg-surface [&>button]:bg-ink [&>button]:text-paper",
  range_middle: "bg-surface",
  selected: "",
};

const BUTTON = "rounded-full border border-transparent text-sm font-medium enabled:hover:border-ink";

/* In the listing calendar a day that cannot be chosen is also struck through (capture C4). */
const SIZES = {
  search: {
    months: "flex justify-center gap-[54px]",
    month: "w-[360.5px]",
    weekday: "h-[28px] w-[51.5px] pb-[11px] text-xs leading-[17px] font-medium text-muted",
    day: "size-[51.5px] p-0 text-center",
    day_button: `size-[51.5px] ${BUTTON}`,
    disabled: "text-faint [&>button]:cursor-not-allowed",
  },
  listing: {
    months: "flex justify-center gap-[26px]",
    month: "w-[308px]",
    weekday: "h-[28px] w-[44px] pb-[11px] text-xs leading-[17px] font-medium text-muted",
    day: "size-[44px] p-0 text-center",
    day_button: `size-[44px] ${BUTTON}`,
    disabled: "text-faint line-through [&>button]:cursor-not-allowed",
  },
};

/**
 * A check-in / check-out picker. react-day-picker draws the months and handles the
 * keyboard; which days may be chosen, and what a click means, come from lib/dates.ts.
 */
export function DateRangeCalendar({ value, onChange, booked = [], months = 2, size = "search" }: Props) {
  const todayDate = today();
  // A phone has room for one month, in the smaller of the two sizes (bonus B6).
  const narrow = useNarrow();
  const sizes = narrow ? { ...SIZES.listing, disabled: SIZES[size].disabled } : SIZES[size];
  const { checkIn, checkOut } = value;
  const choosingCheckOut = checkIn !== null && checkOut === null;

  const selectable = (day: string) =>
    choosingCheckOut && day > checkIn
      ? isSelectableCheckOut(day, checkIn, todayDate, booked)
      : isSelectableCheckIn(day, todayDate, booked);

  return (
    <DayPicker
      mode="range"
      numberOfMonths={narrow ? 1 : months}
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
      classNames={{ ...SHARED, ...sizes }}
    />
  );
}
