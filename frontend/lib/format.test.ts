import { describe, expect, it } from "vitest";
import {
  formatDateRange,
  formatHomes,
  formatMoney,
  formatRating,
  listingHeadline,
  shortPlace,
} from "./format";

describe("formatMoney", () => {
  it("writes paise as whole rupees with Indian digit grouping", () => {
    expect(formatMoney(450_000)).toBe("₹4,500");
    expect(formatMoney(12_345_600)).toBe("₹1,23,456");
    expect(formatMoney(0)).toBe("₹0");
  });

  it("rounds leftover paise to the nearest rupee", () => {
    expect(formatMoney(450_049)).toBe("₹4,500");
    expect(formatMoney(450_050)).toBe("₹4,501");
  });
});

describe("formatRating", () => {
  it("shows two decimals and drops one trailing zero, as the captures do", () => {
    expect(formatRating(4.84)).toBe("4.84");
    expect(formatRating(4.9)).toBe("4.9");
    expect(formatRating(5)).toBe("5.0");
    expect(formatRating(4.846)).toBe("4.85");
  });
});

describe("listingHeadline", () => {
  it("joins the property type and the city", () => {
    expect(listingHeadline("Villa", "Goa")).toBe("Villa in Goa");
  });
});

describe("formatDateRange", () => {
  it("shortens a range inside one month, as capture B1 does", () => {
    expect(formatDateRange("2026-10-29", "2026-10-30")).toBe("29–30 Oct");
  });

  it("names both months otherwise", () => {
    expect(formatDateRange("2026-10-29", "2026-11-02")).toBe("29 Oct – 2 Nov");
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("30 Dec – 2 Jan");
  });
});

describe("formatHomes and shortPlace", () => {
  it("counts homes", () => {
    expect(formatHomes(1)).toBe("1 home");
    expect(formatHomes(0)).toBe("0 homes");
    expect(formatHomes(1234)).toBe("1,234 homes");
  });

  it("keeps the first part of a place", () => {
    expect(shortPlace("Goa, India")).toBe("Goa");
    expect(shortPlace("Manali")).toBe("Manali");
  });
});
