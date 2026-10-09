"use client";

import { DateRangeCalendar } from "@/components/search/date-range-calendar";
import { stayHeading } from "./booking-panels";
import { useBooking, type BookableListing } from "./use-booking";

type Props = { listing: BookableListing; city: string };

/**
 * The availability calendar in the page (R-LD-3; capture C1, "2 nights in Chandigarh"):
 * a 22 px heading with the range under it, then two months. Days in the past and nights
 * already booked cannot be chosen (plan §10.2). It shows and changes the same stay as the
 * booking card, because both read it from the URL.
 */
export function StayCalendar({ listing, city }: Props) {
  const { stay, setStay, booked } = useBooking(listing);
  const dates = { checkIn: stay.checkIn, checkOut: stay.checkOut };
  const { title, line } = stayHeading(dates);

  return (
    <section aria-labelledby="calendar-heading" className="border-t border-line py-12">
      <h2 id="calendar-heading" className="text-[22px] leading-[26px] font-medium tracking-[-0.44px]">
        {stay.checkIn && stay.checkOut ? `${title} in ${city}` : title}
      </h2>
      <p className="pt-2 pb-2 text-sm leading-[18px] text-muted">{line}</p>
      <div className="-ml-0.5 flex">
        <DateRangeCalendar value={dates} onChange={(next) => setStay(next)} booked={booked} size="listing" />
      </div>
      <div className="flex justify-end pt-2 pr-1">
        <button
          type="button"
          disabled={!stay.checkIn}
          onClick={() => setStay({ checkIn: null, checkOut: null })}
          className="rounded-lg px-2 py-2 text-sm font-medium underline hover:bg-surface disabled:text-faint disabled:no-underline"
        >
          Clear dates
        </button>
      </div>
    </section>
  );
}
