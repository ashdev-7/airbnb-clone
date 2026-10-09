/**
 * The address of a listing page ⇄ the stay being planned on it. With lib/search-params.ts
 * (the search pages) this is the only place that knows page-URL parameter names.
 *
 * Names follow capture C2: `check_in`, `check_out`, `adults`; the listing page also carries
 * `modal` when the photo tour is open (C5). `children`, `infants`, `pets` and the values of
 * `modal` are ours. The dates and guests are in the URL so that a reload, a shared link
 * and the checkout page all see the same stay.
 */

import { isIsoDate, type IsoDate } from "./dates";
import { sanitizeGuests, type GuestCounts } from "./guests";
import type { RawParams } from "./search-params";

/** What is open over the listing page. Back closes it, because it is part of the URL. */
export type StayModal = "photos" | "photo" | "amenities" | "reviews" | null;

export type StayState = {
  checkIn: IsoDate | null;
  /** May be null while only the first day has been picked. */
  checkOut: IsoDate | null;
  guests: GuestCounts;
  modal: StayModal;
  /** Which photo the single-photo view shows, from 0. */
  photo: number;
};

const MODALS: readonly string[] = ["photos", "photo", "amenities", "reviews"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function count(value: string | string[] | undefined): number | undefined {
  const text = first(value);
  return text && /^\d{1,4}$/.test(text) ? Number(text) : undefined;
}

/** Reads the stay from a listing page's parameters; anything malformed is dropped. */
export function parseStay(params: RawParams): StayState {
  const checkIn = first(params.check_in);
  const checkOut = first(params.check_out);
  const hasCheckIn = isIsoDate(checkIn);
  const hasCheckOut = hasCheckIn && isIsoDate(checkOut) && checkIn < checkOut;
  const modal = first(params.modal);

  // A stay is for at least one adult (plan §10.8), so the page starts from one.
  const guests = sanitizeGuests({
    adults: Math.max(count(params.adults) ?? 1, 1),
    children: count(params.children),
    infants: count(params.infants),
    pets: count(params.pets),
  });

  return {
    checkIn: hasCheckIn ? checkIn : null,
    checkOut: hasCheckOut ? checkOut : null,
    guests,
    modal: modal && MODALS.includes(modal) ? (modal as StayModal) : null,
    photo: count(params.photo) ?? 0,
  };
}

function stayParams(state: Pick<StayState, "checkIn" | "checkOut" | "guests">): URLSearchParams {
  const query = new URLSearchParams();
  if (state.checkIn) query.set("check_in", state.checkIn);
  if (state.checkIn && state.checkOut) query.set("check_out", state.checkOut);
  query.set("adults", String(state.guests.adults));
  if (state.guests.children > 0) query.set("children", String(state.guests.children));
  if (state.guests.infants > 0) query.set("infants", String(state.guests.infants));
  if (state.guests.pets > 0) query.set("pets", String(state.guests.pets));
  return query;
}

/** The address of a listing page showing this stay (and what is open over it). */
export function stayHref(listingId: number, state: StayState): string {
  const query = stayParams(state);
  if (state.modal) query.set("modal", state.modal);
  if (state.modal === "photo") query.set("photo", String(state.photo));
  return `/rooms/${listingId}?${query.toString()}`;
}

/** True once both dates are chosen: only then can a price be asked for. */
export function hasDates(state: Pick<StayState, "checkIn" | "checkOut">): state is {
  checkIn: IsoDate;
  checkOut: IsoDate;
} {
  return state.checkIn !== null && state.checkOut !== null;
}

/** The query of GET /api/listings/{id}/quote for this stay; null until both dates are set. */
export function quoteQuery(state: Pick<StayState, "checkIn" | "checkOut" | "guests">): string | null {
  return hasDates(state) ? stayParams(state).toString() : null;
}

/** Where "Reserve" leads (capture D1: `/book/stays/{id}`), carrying the stay. */
export function checkoutHref(listingId: number, state: Pick<StayState, "checkIn" | "checkOut" | "guests">): string {
  return `/book/stays/${listingId}?${stayParams(state).toString()}`;
}
