/**
 * Search state ⇄ URL. The only place that knows the names of page-URL parameters
 * (plan §7.4). Phase 5 needs the page number; location, dates, guests and filters join
 * in Phase 6.
 */

export const PAGE_PARAM = "page";

type RawParam = string | string[] | undefined;

/** A missing, malformed or out-of-range page number means the first page. */
export function parsePage(value: RawParam): number {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || !/^\d{1,6}$/.test(text)) return 1;
  return Math.max(1, Number(text));
}

/** The address of a page of results. Page 1 has no parameter, so it has one address. */
export function pageHref(pathname: string, page: number): string {
  return page <= 1 ? pathname : `${pathname}?${PAGE_PARAM}=${page}`;
}

/** Where a listing lives (REF-H5). */
export function listingHref(listingId: number): string {
  return `/rooms/${listingId}`;
}

/** Capture B1: each listing opens in a tab of its own, reused when clicked again. */
export function listingTarget(listingId: number): string {
  return `listing_${listingId}`;
}
