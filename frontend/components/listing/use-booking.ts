"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLoginGate } from "@/hooks/use-login-gate";
import { useMeta } from "@/hooks/use-meta";
import { useStay } from "@/hooks/use-stay";
import { ApiError } from "@/lib/api/errors";
import { getAvailability, getQuote } from "@/lib/api/stay";
import type { Stay } from "@/lib/dates";
import { listingLimits } from "@/lib/guests";
import { checkoutHref, hasDates, quoteQuery } from "@/lib/stay-params";

export type BookableListing = { id: number; max_guests: number; pets_allowed: boolean };

/** Why a stay cannot be priced, in words for the guest (plan §6.13). */
function problem(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "dates_unavailable") return "Those dates are not available. Please choose other dates.";
    if (error.code === "invalid_dates" || error.code === "invalid_guest_count") return error.message;
  }
  return "We could not get the price. Check your connection and try again.";
}

/**
 * Everything the booking card and the calendar section need about a stay on one listing:
 * the stay itself (from the URL), the nights already booked, the limits on guests, and
 * the price. The price always comes from the server's quote; it is asked for again
 * whenever the dates or the guests change, and never computed here (plan §7.4 rule 4).
 */
export function useBooking(listing: BookableListing) {
  const stayState = useStay(listing.id);
  const { stay } = stayState;
  const { guestLimits } = useMeta();
  const limits = useMemo(() => listingLimits(guestLimits, listing), [guestLimits, listing]);

  const availability = useQuery({
    queryKey: ["availability", listing.id],
    queryFn: () => getAvailability(listing.id),
    // Another guest can book at any moment: ask again whenever the page is come back to.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  // Several parts of the page use this hook, and they attach at different moments: one
  // that attaches late must still start from what the server drew (see useHydrated),
  // or its booked days would keep the server's enabled buttons.
  const hydrated = useHydrated();
  const ranges = hydrated ? availability.data?.booked : undefined;
  const booked: Stay[] = useMemo(
    () => (ranges ?? []).map((range) => ({ checkIn: range.check_in, checkOut: range.check_out })),
    [ranges],
  );

  const query = quoteQuery(stay);
  const quote = useQuery({
    queryKey: ["quote", listing.id, query],
    queryFn: () => getQuote(listing.id, query ?? ""),
    enabled: query !== null,
    // A refusal (dates taken, too many guests) is an answer, not a failure to retry.
    retry: false,
  });

  const priced = hydrated && query !== null ? quote.data : undefined;

  const router = useRouter();
  const gate = useLoginGate();
  /**
   * "Reserve": on to checkout, signing in first if need be (plan §6.6). Without dates,
   * `needDates` is called instead; without a price (dates taken, still loading) nothing happens.
   */
  const reserve = useCallback(
    (needDates: () => void) => {
      if (!hasDates(stay)) return needDates();
      if (!priced) return;
      const href = checkoutHref(listing.id, stay);
      gate({ kind: "visit", href }, () => router.push(href));
    },
    [stay, priced, listing.id, gate, router],
  );

  return {
    ...stayState,
    limits,
    booked,
    quote: priced,
    quoteLoading: query !== null && (!hydrated || quote.isPending),
    quoteProblem: hydrated && query !== null && quote.isError ? problem(quote.error) : null,
    retryQuote: quote.refetch,
    reserve,
  };
}
