import { describe, expect, it } from "vitest";
import { pageItems } from "./pagination";

describe("pageItems", () => {
  it("matches capture B2: page 1 of 15 is 1 2 3 4 … 15", () => {
    expect(pageItems(1, 15)).toEqual([1, 2, 3, 4, "gap", 15]);
  });

  it("shows every page when there are few", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]);
    expect(pageItems(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the first and last page around the current one", () => {
    expect(pageItems(3, 15)).toEqual([1, 2, 3, 4, "gap", 15]);
    expect(pageItems(4, 15)).toEqual([1, "gap", 3, 4, 5, "gap", 15]);
    expect(pageItems(8, 15)).toEqual([1, "gap", 7, 8, 9, "gap", 15]);
    expect(pageItems(12, 15)).toEqual([1, "gap", 11, 12, 13, "gap", 15]);
    expect(pageItems(13, 15)).toEqual([1, "gap", 12, 13, 14, 15]);
    expect(pageItems(15, 15)).toEqual([1, "gap", 12, 13, 14, 15]);
  });

  it("always includes the current page, once", () => {
    for (let total = 1; total <= 30; total++) {
      for (let page = 1; page <= total; page++) {
        const numbers = pageItems(page, total).filter((item) => item !== "gap");
        expect(numbers.filter((item) => item === page)).toHaveLength(1);
        expect(numbers).toEqual([...numbers].sort((a, b) => Number(a) - Number(b)));
        expect(new Set(numbers).size).toBe(numbers.length);
      }
    }
  });
});
