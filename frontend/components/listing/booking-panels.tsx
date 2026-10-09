"use client";

import { X } from "lucide-react";
import { DateRangeCalendar } from "@/components/search/date-range-calendar";
import { ServiceAnimalLink } from "@/components/search/service-animal";
import { Stepper } from "@/components/ui/stepper";
import { nightsBetween, type DateSelection, type Stay } from "@/lib/dates";
import { formatFieldDate, formatLongDay, plural } from "@/lib/format";
import {
  BOOKING_HINTS,
  GUEST_ROWS,
  maxFor,
  minForBooking,
  setGuests,
  type GuestCounts,
  type GuestLimits,
} from "@/lib/guests";

/** "3 nights" and "29 Oct 2026 - 1 Nov 2026", or what to do next (capture C4). */
export function stayHeading(dates: DateSelection): { title: string; line: string } {
  if (dates.checkIn && dates.checkOut) {
    return {
      title: plural(nightsBetween(dates.checkIn, dates.checkOut), "night"),
      line: `${formatLongDay(dates.checkIn)} - ${formatLongDay(dates.checkOut)}`,
    };
  }
  return dates.checkIn
    ? { title: "Select checkout date", line: "Choose the day you leave" }
    : { title: "Select check-in date", line: "Add your travel dates for exact pricing" };
}

/**
 * One of the two date fields at the top right of the date panel (capture C4): the label in
 * 10 px bold capitals over the date written as in C2 ("10/29/2026"), with a cross to clear
 * it; the field being filled has a dark outline.
 */
function DateField({
  label,
  date,
  current,
  onClear,
}: {
  label: string;
  date: string | null;
  current: boolean;
  onClear: () => void;
}) {
  return (
    <div className={`flex flex-1 items-center justify-between px-3 py-2.5 ${current ? "rounded-lg outline-2 outline-ink" : ""}`}>
      <div>
        <span className="block text-[10px] leading-3 font-bold uppercase">{label}</span>
        <span className={`text-sm leading-[18px] ${date ? "" : "text-muted"}`}>
          {date ? formatFieldDate(date) : "Add date"}
        </span>
      </div>
      {date && (
        <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={onClear} className="flex size-6 items-center justify-center rounded-full hover:bg-control">
          <X size={12} strokeWidth={3} aria-hidden />
        </button>
      )}
    </div>
  );
}

type DatesProps = {
  dates: DateSelection;
  booked: readonly Stay[];
  onChange: (dates: DateSelection) => void;
  onClose: () => void;
};

/**
 * The date panel of the booking card (capture C4): 661 px wide, opening over the card;
 * the number of nights and the range at the top left, two months of 44 px days, and
 * "Clear dates" and "Close" at the bottom right.
 */
export function DatesPanel({ dates, booked, onChange, onClose }: DatesProps) {
  const { title, line } = stayHeading(dates);
  return (
    <div
      role="dialog"
      aria-label="Choose dates"
      className="absolute -top-6 -right-8 z-[5] w-[661px] rounded-2xl bg-white px-8 pt-6 pb-4 shadow-[0_2px_16px_rgb(0_0_0/0.15)]"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="text-[22px] leading-[26px] font-medium">{title}</h3>
          <p className="pt-2 pb-2 text-sm leading-[18px] text-muted">{line}</p>
        </div>
        <div className="flex w-[315px] shrink-0 divide-x divide-muted rounded-lg border border-muted">
          <DateField
            label="Check-in"
            date={dates.checkIn}
            current={!dates.checkIn || Boolean(dates.checkOut)}
            onClear={() => onChange({ checkIn: null, checkOut: null })}
          />
          <DateField
            label="Checkout"
            date={dates.checkOut}
            current={Boolean(dates.checkIn) && !dates.checkOut}
            onClear={() => onChange({ checkIn: dates.checkIn, checkOut: null })}
          />
        </div>
      </div>
      <DateRangeCalendar value={dates} onChange={onChange} booked={booked} size="listing" />
      <div className="flex items-center justify-end gap-4 pt-2">
        <button
          type="button"
          onClick={() => onChange({ checkIn: null, checkOut: null })}
          className="rounded-lg px-2 py-2 text-sm font-medium underline hover:bg-surface"
        >
          Clear dates
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

type GuestsProps = {
  guests: GuestCounts;
  limits: GuestLimits;
  petsAllowed: boolean;
  onChange: (guests: GuestCounts) => void;
  onClose: () => void;
};

/**
 * The guest panel of the booking card (capture C3): it opens under the "Guests" field at
 * the same width; four rows with the age text of the card, and the capacity note under
 * them. Infants do not count toward the maximum (C3).
 */
export function GuestsPanel({ guests, limits, petsAllowed, onChange, onClose }: GuestsProps) {
  return (
    <div
      role="dialog"
      aria-label="Choose guests"
      className="absolute inset-x-0 top-full z-[5] rounded-b-lg bg-white p-4 shadow-[0_2px_6px_rgb(0_0_0/0.15)]"
    >
      <ul>
        {GUEST_ROWS.map(({ kind, label }) => (
          <li key={kind} className="flex items-center justify-between py-3">
            <div>
              <h4 className="text-base leading-5 font-medium">{label}</h4>
              {kind === "pets" ? (
                <ServiceAnimalLink className="text-sm leading-[18px]" />
              ) : (
                <p className="text-sm leading-[18px]">{BOOKING_HINTS[kind]}</p>
              )}
            </div>
            <Stepper
              label={label}
              value={guests[kind]}
              min={minForBooking(kind, limits)}
              max={maxFor(kind, guests, limits)}
              onChange={(value) => onChange(setGuests(guests, kind, value, limits))}
            />
          </li>
        ))}
      </ul>
      <p className="pt-2 text-xs leading-4">
        This place has a maximum of {plural(limits.max_guests, "guest")}, not including infants.{" "}
        {petsAllowed ? `Up to ${plural(limits.max_pets, "pet")} may come along.` : "Pets aren’t allowed."}
      </p>
      <div className="flex justify-end pt-2">
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-2 text-base font-medium underline hover:bg-surface">
          Close
        </button>
      </div>
    </div>
  );
}
