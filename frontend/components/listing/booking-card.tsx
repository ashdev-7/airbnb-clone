"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { inOverlay, overlayOpen } from "@/components/ui/overlay";
import { useCloseWhenHidden } from "@/components/ui/use-close-when-hidden";
import { formatFieldDate, formatMoney } from "@/lib/format";
import { guestSummary } from "@/lib/guests";
import { hasDates } from "@/lib/stay-params";
import { DatesPanel, GuestsPanel } from "./booking-panels";
import { PriceBreakdown } from "./price-breakdown";
import { useBooking, type BookableListing } from "./use-booking";

type Props = { listing: BookableListing & { price_per_night_minor: number } };

const LABEL = "block text-[10px] leading-3 font-bold uppercase";
const FIELD = "flex-1 px-3 py-2.5 text-left";

/**
 * The booking card (capture C2): 372 px wide, 24 px padding, 12 px corners, a hairline
 * border and a soft shadow; it stays in view while the page scrolls. Dates and guests
 * are chosen here and kept in the URL; the breakdown under "Reserve" is the server's
 * quote for exactly that stay (R-LD-4). "Reserve" leads to checkout, after login.
 */
export function BookingCard({ listing }: Props) {
  const { stay, setStay, limits, booked, quote, quoteLoading, quoteProblem, retryQuote, reserve } =
    useBooking(listing);
  const [open, setOpen] = useState<"dates" | "guests" | null>(null);
  const root = useRef<HTMLElement>(null);
  useCloseWhenHidden(() => setOpen(null));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !inOverlay(event.target)) setOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !overlayOpen()) setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    // Capture phase, so this runs before an open modal handles the key and closes itself.
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const ready = hasDates(stay);

  return (
    <aside
      ref={root}
      id="booking"
      aria-label="Reserve this place"
      className="sticky top-[104px] scroll-mt-28 rounded-xl border border-line bg-white p-6 shadow-[0_6px_16px_rgb(0_0_0/0.12)]"
    >
      <p className="pb-6 text-base leading-5">
        <span className="text-[22px] leading-[normal] font-medium">{formatMoney(listing.price_per_night_minor)}</span>{" "}
        per night
      </p>

      <div className="relative rounded-lg border border-muted">
        <button
          type="button"
          aria-expanded={open === "dates"}
          onClick={() => setOpen(open === "dates" ? null : "dates")}
          className="flex w-full divide-x divide-muted border-b border-muted"
        >
          <span className={FIELD}>
            <span className={LABEL}>Check-in</span>
            <span className={`text-sm leading-[18px] ${stay.checkIn ? "text-black" : "text-muted"}`}>
              {stay.checkIn ? formatFieldDate(stay.checkIn) : "Add date"}
            </span>
          </span>
          <span className={FIELD}>
            <span className={LABEL}>Checkout</span>
            <span className={`text-sm leading-[18px] ${stay.checkOut ? "text-black" : "text-muted"}`}>
              {stay.checkOut ? formatFieldDate(stay.checkOut) : "Add date"}
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-expanded={open === "guests"}
          onClick={() => setOpen(open === "guests" ? null : "guests")}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        >
          <span>
            <span className={LABEL}>Guests</span>
            <span className="text-sm leading-[18px] text-black">{guestSummary(stay.guests)}</span>
          </span>
          <ChevronDown size={18} className={open === "guests" ? "rotate-180" : ""} aria-hidden />
        </button>
        {open === "guests" && (
          <GuestsPanel
            guests={stay.guests}
            limits={limits}
            petsAllowed={listing.pets_allowed}
            onChange={(guests) => setStay({ guests })}
            onClose={() => setOpen(null)}
          />
        )}
      </div>
      {open === "dates" && (
        <DatesPanel
          dates={{ checkIn: stay.checkIn, checkOut: stay.checkOut }}
          booked={booked}
          onChange={(dates) => setStay(dates)}
          onClose={() => setOpen(null)}
        />
      )}

      <button
        type="button"
        onClick={() => reserve(() => setOpen("dates"))}
        disabled={ready && !quote}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-full text-base leading-5 font-medium text-white [background:var(--gradient-primary)] disabled:opacity-50"
      >
        {ready ? "Reserve" : "Check availability"}
      </button>

      <div aria-live="polite">
        {!ready && <p className="pt-4 text-center text-sm leading-[18px] text-muted">Add dates to see the price</p>}
        {ready && quoteLoading && (
          <div className="grid gap-4 pt-6" role="status" aria-label="Getting the price">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        )}
        {quoteProblem && (
          <div role="alert" className="pt-4 text-sm leading-[18px] text-action">
            <p>{quoteProblem}</p>
            <button type="button" onClick={() => retryQuote()} className="pt-1 font-medium underline">
              Try again
            </button>
          </div>
        )}
        {quote && (
          <>
            <p className="pt-2 pb-6 text-center text-sm leading-[18px]">You won’t be charged yet</p>
            <PriceBreakdown quote={quote} />
          </>
        )}
      </div>
    </aside>
  );
}
