import { formatLongDay, plural } from "@/lib/format";
import { guestSummary } from "@/lib/guests";
import type { Booking, BookingPeriod } from "@/types/booking";

const PERIOD_LABELS: Record<BookingPeriod, string> = {
  upcoming: "Upcoming",
  current: "Staying now",
  past: "Completed",
  cancelled: "Cancelled",
};

export function StatusTag({ period }: { period: BookingPeriod }) {
  return (
    <span className="rounded-full bg-control px-2.5 py-1 text-xs leading-4 font-medium text-muted">
      {PERIOD_LABELS[period]}
    </span>
  );
}

/** "29 Oct 2026 - 1 Nov 2026 · 3 nights" */
export function tripDates(booking: Booking): string {
  return `${formatLongDay(booking.check_in)} - ${formatLongDay(booking.check_out)} · ${plural(booking.nights, "night")}`;
}

export function tripGuests(booking: Booking): string {
  return (
    guestSummary({
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants,
      pets: booking.pets,
    }) ?? ""
  );
}
