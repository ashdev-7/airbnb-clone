/**
 * Date rules (plan §10.1, §10.2). A date is always a "YYYY-MM-DD" string: a calendar day,
 * with no time and no time zone. The server decides in the end; these rules exist so the
 * calendar does not offer a day the server would refuse.
 */

import { APP_TIME_ZONE } from "./config";

export type IsoDate = string;

/** A stay: the guest sleeps on every night from `checkIn` up to, not including, `checkOut`. */
export type Stay = { checkIn: IsoDate; checkOut: IsoDate };

/** How far ahead a stay may end. The same number as the server's (bookings/availability.py). */
export const MAX_ADVANCE_DAYS = 730;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Days since 1970-01-01, computed in UTC so daylight saving never shifts a day. */
function dayNumber(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** True for a real calendar day in the right form ("2026-02-30" is not one). */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  return new Date(dayNumber(value) * DAY_MS).toISOString().slice(0, 10) === value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  return dayNumber(checkOut) - dayNumber(checkIn);
}

/** Today's date where the business is (plan §4, D2), whatever the visitor's clock says. */
export function today(now: Date = new Date(), timeZone: string = APP_TIME_ZONE): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** The calendar works with Date objects at local midnight; these two convert without drift. */
export function toLocalDate(date: IsoDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function fromLocalDate(date: Date): IsoDate {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The last day a stay may end on. */
export function lastBookableDay(todayDate: IsoDate): IsoDate {
  return addDays(todayDate, MAX_ADVANCE_DAYS);
}

/** True when the night of `day` belongs to one of the booked stays. */
function isBookedNight(day: IsoDate, booked: readonly Stay[]): boolean {
  return booked.some((stay) => stay.checkIn <= day && day < stay.checkOut);
}

/** A day a stay may start on: not past, with a night after it in the window, and free. */
export function isSelectableCheckIn(
  day: IsoDate,
  todayDate: IsoDate,
  booked: readonly Stay[] = [],
): boolean {
  return day >= todayDate && day < lastBookableDay(todayDate) && !isBookedNight(day, booked);
}

/**
 * A day a stay starting on `checkIn` may end on: after it, and no later than the next
 * booked check-in, so the day another stay begins is a valid day to leave (plan §10.2).
 */
export function isSelectableCheckOut(
  day: IsoDate,
  checkIn: IsoDate,
  todayDate: IsoDate,
  booked: readonly Stay[] = [],
): boolean {
  if (day <= checkIn || day > lastBookableDay(todayDate)) return false;
  const nextBooked = booked
    .map((stay) => stay.checkIn)
    .filter((start) => start >= checkIn)
    .sort()[0];
  return nextBooked === undefined || day <= nextBooked;
}

/** A complete, bookable stay. Used to drop dates from a URL that no longer make sense. */
export function isValidStay(
  checkIn: IsoDate,
  checkOut: IsoDate,
  todayDate: IsoDate,
  booked: readonly Stay[] = [],
): boolean {
  return (
    isSelectableCheckIn(checkIn, todayDate, booked) &&
    isSelectableCheckOut(checkOut, checkIn, todayDate, booked)
  );
}

export type DateSelection = { checkIn: IsoDate | null; checkOut: IsoDate | null };

/**
 * What a click on `day` does to the selection: the first click sets check-in, a later day
 * then sets check-out, and any other click starts again from that day.
 */
export function selectDay(selection: DateSelection, day: IsoDate): DateSelection {
  if (selection.checkIn && !selection.checkOut && day > selection.checkIn) {
    return { checkIn: selection.checkIn, checkOut: day };
  }
  return { checkIn: day, checkOut: null };
}
