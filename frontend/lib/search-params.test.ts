import { describe, expect, it } from "vitest";
import { listingHref, listingTarget, pageHref, parsePage } from "./search-params";

describe("parsePage", () => {
  it("reads a page number", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "9"])).toBe(2);
  });

  it("falls back to the first page for anything else", () => {
    for (const value of [undefined, "", "0", "-1", "abc", "1.5", "2e3", " 2", "9999999"]) {
      expect(parsePage(value)).toBe(1);
    }
  });
});

describe("pageHref", () => {
  it("gives page 1 the bare address and later pages a parameter", () => {
    expect(pageHref("/", 1)).toBe("/");
    expect(pageHref("/", 4)).toBe("/?page=4");
  });

  it("round-trips with parsePage", () => {
    const href = pageHref("/", 7);
    expect(parsePage(new URL(href, "http://x").searchParams.get("page") ?? undefined)).toBe(7);
  });
});

describe("listing links", () => {
  it("point at the listing page and a tab named after the listing (capture B1)", () => {
    expect(listingHref(12)).toBe("/rooms/12");
    expect(listingTarget(12)).toBe("listing_12");
  });
});
