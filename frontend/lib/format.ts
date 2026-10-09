/** How values are written on screen: money, ratings, date ranges (plan §7.4). */

import { toLocalDate, type IsoDate } from "./dates";

const MINOR_PER_RUPEE = 100;

const rupeeFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 450000 paise → "₹4,500". Prices are whole rupees; any paise are rounded (capture B1). */
export function formatMoney(minor: number): string {
  return rupeeFormat.format(Math.round(minor / MINOR_PER_RUPEE));
}

/** The same, for an amount already in whole rupees (a price filter). */
export function formatRupees(rupees: number): string {
  return rupeeFormat.format(rupees);
}

/**
 * Ratings as the captures show them: two decimals, with one trailing zero dropped
 * ("4.84", "4.9", "5.0").
 */
export function formatRating(average: number): string {
  const text = average.toFixed(2);
  return text.endsWith("0") ? text.slice(0, -1) : text;
}

/** "{Property type} in {city}", the first line of a card (REF-I2). */
export function listingHeadline(propertyType: string, city: string): string {
  return `${propertyType} in ${city}`;
}

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

/** "10 Oct" */
export function formatDay(date: IsoDate): string {
  return dayMonth.format(toLocalDate(date));
}

/** "29–30 Oct" inside one month (capture B1), "29 Oct – 2 Nov" across two. */
export function formatDateRange(checkIn: IsoDate, checkOut: IsoDate): string {
  if (checkIn.slice(0, 7) === checkOut.slice(0, 7)) {
    return `${Number(checkIn.slice(8))}–${formatDay(checkOut)}`;
  }
  return `${formatDay(checkIn)} – ${formatDay(checkOut)}`;
}

/** "1 home", "23 homes" */
export function formatHomes(count: number): string {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? "home" : "homes"}`;
}

/** The first part of a place label: "Goa, India" → "Goa". */
export function shortPlace(location: string): string {
  return location.split(",")[0].trim();
}
