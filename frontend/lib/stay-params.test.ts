import { describe, expect, it } from "vitest";
import type { RawParams } from "./search-params";
import { checkoutHref, hasDates, parseStay, quoteQuery, stayHref, type StayState } from "./stay-params";

const STAY: StayState = {
  checkIn: "2026-10-29",
  checkOut: "2026-11-02",
  guests: { adults: 2, children: 1, infants: 1, pets: 1 },
  modal: null,
  photo: 0,
};

function read(href: string): StayState {
  const params: RawParams = {};
  for (const [key, value] of new URL(href, "http://airstay.test").searchParams) params[key] = value;
  return parseStay(params);
}

describe("round trip", () => {
  it("state → address → state is the same state", () => {
    for (const state of [
      STAY,
      { ...STAY, checkOut: null },
      { ...STAY, checkIn: null, checkOut: null },
      { ...STAY, modal: "photos" as const },
      { ...STAY, modal: "photo" as const, photo: 3 },
      { ...STAY, modal: "reviews" as const },
    ]) {
      expect(read(stayHref(12, state))).toEqual(state);
    }
  });

  it("uses the names of capture C2", () => {
    expect(stayHref(12, STAY)).toBe(
      "/rooms/12?check_in=2026-10-29&check_out=2026-11-02&adults=2&children=1&infants=1&pets=1",
    );
  });
});

describe("parseStay", () => {
  it("starts from one adult and no dates", () => {
    expect(parseStay({})).toEqual({
      checkIn: null,
      checkOut: null,
      guests: { adults: 1, children: 0, infants: 0, pets: 0 },
      modal: null,
      photo: 0,
    });
    expect(parseStay({ adults: "0" }).guests.adults).toBe(1);
  });

  it("drops malformed dates, keeping a lone check-in", () => {
    expect(parseStay({ check_in: "2026-10-29" })).toMatchObject({ checkIn: "2026-10-29", checkOut: null });
    for (const params of [
      { check_out: "2026-10-30" },
      { check_in: "2026-02-30", check_out: "2026-03-02" },
      { check_in: "soon", check_out: "2026-10-30" },
    ]) {
      expect(parseStay(params)).toMatchObject({ checkIn: null, checkOut: null });
    }
    expect(parseStay({ check_in: "2026-10-30", check_out: "2026-10-29" })).toMatchObject({
      checkIn: "2026-10-30",
      checkOut: null,
    });
  });

  it("keeps guests inside the limits and ignores an unknown modal", () => {
    const state = parseStay({ adults: "99", infants: "9", modal: "settings", photo: "x" });
    expect(state.guests).toEqual({ adults: 16, children: 0, infants: 5, pets: 0 });
    expect(state.modal).toBeNull();
    expect(state.photo).toBe(0);
  });
});

describe("quote and checkout", () => {
  it("asks for a price only once both dates are chosen", () => {
    expect(hasDates(STAY)).toBe(true);
    expect(quoteQuery(STAY)).toBe("check_in=2026-10-29&check_out=2026-11-02&adults=2&children=1&infants=1&pets=1");
    expect(quoteQuery({ ...STAY, checkOut: null })).toBeNull();
    expect(quoteQuery({ ...STAY, checkIn: null, checkOut: null })).toBeNull();
  });

  it("carries the stay to the checkout page, without what was open", () => {
    expect(checkoutHref(12, { ...STAY, modal: "photos" } as StayState)).toBe(
      "/book/stays/12?check_in=2026-10-29&check_out=2026-11-02&adults=2&children=1&infants=1&pets=1",
    );
  });
});
