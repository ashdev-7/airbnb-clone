/**
 * Search state ⇄ URL ⇄ API. The only place that knows the names of page-URL parameters
 * (plan §7.4, §10.6). The search, its filters and the page number all live in the URL,
 * so a search can be linked to, reloaded, and stepped through with Back.
 *
 * Names on the search page: `checkin`, `checkout`, `adults` (capture B1) and `min_bedrooms`,
 * `min_beds`, `min_bathrooms` (capture B5). Names on the listing page: `check_in`,
 * `check_out`, `adults` (capture C2). The rest, `pets_allowed` among them, are ours until a
 * capture shows them.
 */

import { isIsoDate, type IsoDate } from "./dates";
import { NO_GUESTS, sanitizeGuests, type GuestCounts } from "./guests";

export type Filters = {
  /** Whole rupees per night; null for no bound. */
  priceMin: number | null;
  priceMax: number | null;
  propertyTypes: string[];
  amenities: string[];
  minBedrooms: number;
  minBeds: number;
  minBathrooms: number;
  /** Only homes whose host allows pets, whether or not a pet is among the guests. */
  petsAllowed: boolean;
};

export type SearchState = Filters & {
  /** What was typed or picked in "Where"; "" for everywhere. */
  location: string;
  checkIn: IsoDate | null;
  checkOut: IsoDate | null;
  guests: GuestCounts;
  page: number;
};

export const NO_FILTERS: Filters = {
  priceMin: null,
  priceMax: null,
  propertyTypes: [],
  amenities: [],
  minBedrooms: 0,
  minBeds: 0,
  minBathrooms: 0,
  petsAllowed: false,
};

export const EMPTY_SEARCH: SearchState = {
  ...NO_FILTERS,
  location: "",
  checkIn: null,
  checkOut: null,
  guests: NO_GUESTS,
  page: 1,
};

export const PAGE_PARAM = "page";
const MAX_ROOMS = 50;
const MAX_LIST = 20;
const SLUG = /^[a-z0-9-]{1,60}$/;
const MINOR_PER_RUPEE = 100;

type Raw = string | string[] | undefined;
export type RawParams = Record<string, Raw>;

const first = (value: Raw) => (Array.isArray(value) ? value[0] : value);
const all = (value: Raw) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

function count(value: Raw, max = 1_000_000): number | undefined {
  const text = first(value);
  if (!text || !/^\d{1,9}$/.test(text)) return undefined;
  return Math.min(Number(text), max);
}

function slugs(value: Raw): string[] {
  return [...new Set(all(value).filter((item) => SLUG.test(item)))].slice(0, MAX_LIST).sort();
}

/** A missing, malformed or out-of-range page number means the first page. */
export function parsePage(value: Raw): number {
  const text = first(value);
  if (!text || !/^\d{1,6}$/.test(text)) return 1;
  return Math.max(1, Number(text));
}

/**
 * Reads a search from the address of a search page. Anything malformed is dropped rather
 * than shown as an error: a half-typed or stale link still opens a sensible search.
 */
export function parseSearch(location: string | undefined, params: RawParams): SearchState {
  const checkIn = first(params.checkin);
  const checkOut = first(params.checkout);
  const datesOk = isIsoDate(checkIn) && isIsoDate(checkOut) && checkIn < checkOut;

  let priceMin = count(params.price_min) ?? null;
  let priceMax = count(params.price_max) ?? null;
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  return {
    location: (location ?? "").trim().slice(0, 200),
    checkIn: datesOk ? checkIn : null,
    checkOut: datesOk ? checkOut : null,
    guests: sanitizeGuests({
      adults: count(params.adults),
      children: count(params.children),
      infants: count(params.infants),
      pets: count(params.pets),
    }),
    priceMin,
    priceMax,
    propertyTypes: slugs(params.property_type),
    amenities: slugs(params.amenities),
    minBedrooms: count(params.min_bedrooms, MAX_ROOMS) ?? 0,
    minBeds: count(params.min_beds, MAX_ROOMS) ?? 0,
    minBathrooms: count(params.min_bathrooms, MAX_ROOMS) ?? 0,
    petsAllowed: first(params.pets_allowed) === "true",
    page: parsePage(params[PAGE_PARAM]),
  };
}

/** The search-page path for a place (REF-H5): `/s/Goa/homes`, or `/s/homes` for everywhere. */
export function searchPath(location: string): string {
  const place = location.trim();
  return place ? `/s/${encodeURIComponent(place)}/homes` : "/s/homes";
}

function setCount(query: URLSearchParams, name: string, value: number): void {
  if (value > 0) query.set(name, String(value));
}

/** The address of a search. Defaults are left out, so equal searches have equal addresses. */
export function searchHref(state: SearchState): string {
  const query = new URLSearchParams();
  if (state.checkIn && state.checkOut) {
    query.set("checkin", state.checkIn);
    query.set("checkout", state.checkOut);
  }
  setCount(query, "adults", state.guests.adults);
  setCount(query, "children", state.guests.children);
  setCount(query, "infants", state.guests.infants);
  setCount(query, "pets", state.guests.pets);
  if (state.priceMin !== null) query.set("price_min", String(state.priceMin));
  if (state.priceMax !== null) query.set("price_max", String(state.priceMax));
  for (const slug of [...state.propertyTypes].sort()) query.append("property_type", slug);
  for (const slug of [...state.amenities].sort()) query.append("amenities", slug);
  setCount(query, "min_bedrooms", state.minBedrooms);
  setCount(query, "min_beds", state.minBeds);
  setCount(query, "min_bathrooms", state.minBathrooms);
  if (state.petsAllowed) query.set("pets_allowed", "true");
  if (state.page > 1) query.set(PAGE_PARAM, String(state.page));

  const text = query.toString();
  return text ? `${searchPath(state.location)}?${text}` : searchPath(state.location);
}

/** The query string of the API for the same search (GET /api/listings and /summary). */
export function apiQuery(state: SearchState, withPage = true): string {
  const query = new URLSearchParams();
  if (state.location) query.set("location", state.location);
  if (state.checkIn && state.checkOut) {
    query.set("check_in", state.checkIn);
    query.set("check_out", state.checkOut);
  }
  setCount(query, "adults", state.guests.adults);
  setCount(query, "children", state.guests.children);
  setCount(query, "infants", state.guests.infants);
  // The API keeps homes that allow pets whenever a pet is asked for (plan §10.6), so the
  // "Pets allowed" filter asks for one even when no pet is among the guests.
  setCount(query, "pets", Math.max(state.guests.pets, state.petsAllowed ? 1 : 0));
  if (state.priceMin !== null) query.set("min_price_minor", String(state.priceMin * MINOR_PER_RUPEE));
  if (state.priceMax !== null) query.set("max_price_minor", String(state.priceMax * MINOR_PER_RUPEE));
  for (const slug of state.propertyTypes) query.append("property_type", slug);
  for (const slug of state.amenities) query.append("amenity", slug);
  setCount(query, "min_bedrooms", state.minBedrooms);
  setCount(query, "min_beds", state.minBeds);
  setCount(query, "min_bathrooms", state.minBathrooms);
  if (withPage && state.page > 1) query.set(PAGE_PARAM, String(state.page));
  return query.toString();
}

export function filtersOf(state: SearchState): Filters {
  const { priceMin, priceMax, propertyTypes, amenities, minBedrooms, minBeds, minBathrooms, petsAllowed } =
    state;
  return { priceMin, priceMax, propertyTypes, amenities, minBedrooms, minBeds, minBathrooms, petsAllowed };
}

/** How many filters are on: the number beside the "Filters" button. */
export function activeFilterCount(filters: Filters): number {
  return (
    (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0) +
    filters.propertyTypes.length +
    filters.amenities.length +
    (filters.minBedrooms > 0 ? 1 : 0) +
    (filters.minBeds > 0 ? 1 : 0) +
    (filters.minBathrooms > 0 ? 1 : 0) +
    (filters.petsAllowed ? 1 : 0)
  );
}

/** Adds a value to a list of slugs, or takes it out if it is there. */
export function toggled(list: readonly string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((item) => item !== slug) : [...list, slug].sort();
}

/** The address of a page of results. Page 1 has no parameter, so it has one address. */
export function pageHref(pathname: string, page: number): string {
  return page <= 1 ? pathname : `${pathname}?${PAGE_PARAM}=${page}`;
}

/** Where a listing lives (REF-H5), carrying the dates and guests of the search (capture C2). */
export function listingHref(
  listingId: number,
  search?: Pick<SearchState, "checkIn" | "checkOut" | "guests">,
): string {
  const query = new URLSearchParams();
  if (search?.checkIn && search.checkOut) {
    query.set("check_in", search.checkIn);
    query.set("check_out", search.checkOut);
  }
  if (search) {
    setCount(query, "adults", search.guests.adults);
    setCount(query, "children", search.guests.children);
    setCount(query, "infants", search.guests.infants);
    setCount(query, "pets", search.guests.pets);
  }
  const text = query.toString();
  return text ? `/rooms/${listingId}?${text}` : `/rooms/${listingId}`;
}

/** Capture B1: each listing opens in a tab of its own, reused when clicked again. */
export function listingTarget(listingId: number): string {
  return `listing_${listingId}`;
}

/** The place in "/s/{place}/homes", decoded; undefined on "/s/homes" and any other path. */
export function locationFromPath(pathname: string): string | undefined {
  const match = /^\/s\/([^/]+)\/homes\/?$/.exec(pathname);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}
