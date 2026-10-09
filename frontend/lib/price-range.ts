/**
 * The arithmetic behind the price filter: paise from the API on one side, the whole
 * rupees a visitor types and drags on the other. Kept out of the components (plan §7.4).
 */

import type { HistogramBucket, ListingSummary } from "@/types/api";

const MINOR_PER_RUPEE = 100;

/** The slider moves in steps of this many rupees, and its ends sit on such a step. */
export const PRICE_STEP = 100;

/** The ends of the slider: the cheapest and dearest nightly price, rounded outwards to a step. */
export type PriceBounds = { min: number; max: number };

export function priceBounds(summary: ListingSummary | undefined): PriceBounds | null {
  if (!summary || summary.price_min_minor === null || summary.price_max_minor === null) return null;
  return {
    min: Math.floor(summary.price_min_minor / MINOR_PER_RUPEE / PRICE_STEP) * PRICE_STEP,
    max: Math.ceil(summary.price_max_minor / MINOR_PER_RUPEE / PRICE_STEP) * PRICE_STEP,
  };
}

/** Each bar's height as a share of the tallest one, between 0 and 1. */
export function barHeights(histogram: readonly HistogramBucket[]): number[] {
  const tallest = Math.max(1, ...histogram.map((bucket) => bucket.count));
  return histogram.map((bucket) => bucket.count / tallest);
}

/** True when a bar's prices overlap the chosen range; the others are drawn grey. */
export function bucketInRange(bucket: HistogramBucket, low: number, high: number): boolean {
  return bucket.to_minor >= low * MINOR_PER_RUPEE && bucket.from_minor <= high * MINOR_PER_RUPEE;
}

/**
 * Turns the two ends of the slider into the filter. An end resting on the cheapest or
 * dearest price means "no bound", so it is left out of the search.
 */
export function toPriceFilter(
  low: number,
  high: number,
  bounds: PriceBounds,
): { priceMin: number | null; priceMax: number | null } {
  const from = Math.min(Math.max(Math.min(low, high), bounds.min), bounds.max);
  const to = Math.min(Math.max(Math.max(low, high), bounds.min), bounds.max);
  return {
    priceMin: from > bounds.min ? from : null,
    priceMax: to < bounds.max ? to : null,
  };
}

/** Reads what was typed in a price box: digits only, or null when it is not a price. */
export function parseRupees(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  if (!digits || digits.length > 9) return null;
  return Number(digits);
}
