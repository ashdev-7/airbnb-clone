import { describe, expect, it } from "vitest";
import { barHeights, bucketInRange, parseRupees, priceBounds, toPriceFilter } from "./price-range";

const BOUNDS = { min: 1700, max: 52000 };

describe("priceBounds", () => {
  it("rounds outwards to a step of the slider", () => {
    const summary = { total: 2, price_min_minor: 170_050, price_max_minor: 5_200_010, currency: "INR", histogram: [] };
    expect(priceBounds(summary)).toEqual({ min: 1700, max: 52100 });
  });

  it("is null when there is nothing to price", () => {
    expect(priceBounds(undefined)).toBeNull();
    expect(
      priceBounds({ total: 0, price_min_minor: null, price_max_minor: null, currency: "INR", histogram: [] }),
    ).toBeNull();
  });
});

describe("histogram", () => {
  const buckets = [
    { from_minor: 100_000, to_minor: 199_999, count: 4 },
    { from_minor: 200_000, to_minor: 299_999, count: 8 },
    { from_minor: 300_000, to_minor: 400_000, count: 0 },
  ];

  it("scales bars to the tallest", () => {
    expect(barHeights(buckets)).toEqual([0.5, 1, 0]);
    expect(barHeights([])).toEqual([]);
    expect(barHeights([{ from_minor: 0, to_minor: 1, count: 0 }])).toEqual([0]);
  });

  it("marks the bars that overlap the chosen range", () => {
    expect(buckets.map((bucket) => bucketInRange(bucket, 2000, 2500))).toEqual([false, true, false]);
    expect(buckets.map((bucket) => bucketInRange(bucket, 1999, 3000))).toEqual([true, true, true]);
  });
});

describe("toPriceFilter", () => {
  it("leaves out an end that rests on a bound", () => {
    expect(toPriceFilter(1700, 52000, BOUNDS)).toEqual({ priceMin: null, priceMax: null });
    expect(toPriceFilter(3000, 52000, BOUNDS)).toEqual({ priceMin: 3000, priceMax: null });
    expect(toPriceFilter(1700, 9000, BOUNDS)).toEqual({ priceMin: null, priceMax: 9000 });
  });

  it("orders the ends and keeps them inside the bounds", () => {
    expect(toPriceFilter(9000, 3000, BOUNDS)).toEqual({ priceMin: 3000, priceMax: 9000 });
    expect(toPriceFilter(10, 99_999, BOUNDS)).toEqual({ priceMin: null, priceMax: null });
  });
});

describe("parseRupees", () => {
  it("reads digits and ignores symbols and separators", () => {
    expect(parseRupees("₹4,500")).toBe(4500);
    expect(parseRupees(" 12 000 ")).toBe(12000);
  });

  it("is null for anything else", () => {
    expect(parseRupees("")).toBeNull();
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("1234567890")).toBeNull();
  });
});
