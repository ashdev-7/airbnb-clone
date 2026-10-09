"use client";

import { useState } from "react";
import {
  barHeights,
  bucketInRange,
  parseRupees,
  PRICE_STEP,
  toPriceFilter,
  type PriceBounds,
} from "@/lib/price-range";
import type { HistogramBucket } from "@/types/api";

type Value = { priceMin: number | null; priceMax: number | null };

type Props = {
  bounds: PriceBounds;
  histogram: readonly HistogramBucket[];
  value: Value;
  onChange: (value: Value) => void;
};

/** One of the two pill-shaped boxes under the slider (capture B5): label above, ₹ inside. */
function PriceBox({
  label,
  value,
  onCommit,
  align,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  align: "start" | "end";
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    const typed = text === null ? null : parseRupees(text);
    if (typed !== null) onCommit(typed);
    setText(null);
  };

  return (
    <label className={`flex flex-col gap-1 ${align === "end" ? "items-end" : "items-start"}`}>
      <span className="px-1 text-xs leading-4 font-medium text-muted">{label}</span>
      <span className="flex h-12 items-center rounded-full px-5 shadow-[inset_0_0_0_1px_var(--color-line)] focus-within:shadow-[inset_0_0_0_2px_var(--color-ink)]">
        <span aria-hidden>₹</span>
        <input
          inputMode="numeric"
          aria-label={`${label} price`}
          value={text ?? String(value)}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          style={{ width: `${Math.max((text ?? String(value)).length, 3)}ch` }}
          className="bg-transparent text-sm leading-[18px] focus:outline-none"
        />
      </span>
    </label>
  );
}

/**
 * The price filter of capture B5: a histogram of nightly prices, a slider with two
 * handles under it, and the two ends as editable boxes. Prices are per night (assignment
 * O5), not the trip total the original filters by.
 */
export function PriceRange({ bounds, histogram, value, onChange }: Props) {
  const low = value.priceMin ?? bounds.min;
  const high = value.priceMax ?? bounds.max;
  const heights = barHeights(histogram);
  const set = (nextLow: number, nextHigh: number) => onChange(toPriceFilter(nextLow, nextHigh, bounds));

  return (
    <div>
      <div aria-hidden className="flex h-16 items-end gap-[2px] px-3">
        {histogram.map((bucket, index) => (
          <span
            key={bucket.from_minor}
            style={{ height: `${Math.max(heights[index] * 100, bucket.count > 0 ? 4 : 0)}%` }}
            className={`flex-1 rounded-t-sm ${bucketInRange(bucket, low, high) ? "bg-[#e31c5f]" : "bg-line"}`}
          />
        ))}
      </div>
      <div className="range-pair relative h-8">
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-line" />
        <input
          type="range"
          aria-label="Minimum price"
          min={bounds.min}
          max={bounds.max}
          step={PRICE_STEP}
          value={low}
          onChange={(event) => set(Math.min(Number(event.target.value), high), high)}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={bounds.min}
          max={bounds.max}
          step={PRICE_STEP}
          value={high}
          onChange={(event) => set(low, Math.max(Number(event.target.value), low))}
        />
      </div>
      <div className="mt-2 flex items-end justify-between">
        <PriceBox label="Minimum" value={low} align="start" onCommit={(typed) => set(typed, Math.max(typed, high))} />
        <PriceBox label="Maximum" value={high} align="end" onCommit={(typed) => set(Math.min(typed, low), typed)} />
      </div>
    </div>
  );
}
