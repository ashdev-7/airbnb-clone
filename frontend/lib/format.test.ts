import { describe, expect, it } from "vitest";
import { formatMoney, formatRating, listingHeadline } from "./format";

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
