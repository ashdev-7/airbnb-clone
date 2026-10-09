import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUEST_LIMITS as LIMITS,
  NO_GUESTS,
  countedGuests,
  guestSummary,
  listingLimits,
  maxFor,
  minFor,
  minForBooking,
  sanitizeGuests,
  setGuests,
} from "./guests";

describe("counting", () => {
  it("counts adults and children, not infants or pets (capture C3)", () => {
    expect(countedGuests({ adults: 2, children: 1, infants: 3, pets: 2 })).toBe(3);
  });
});

describe("limits", () => {
  it("shares 16 places between adults and children (capture A5)", () => {
    const full = { adults: 16, children: 0, infants: 0, pets: 0 };
    expect(maxFor("adults", full, LIMITS)).toBe(16);
    expect(maxFor("children", full, LIMITS)).toBe(0);
    const mixed = { adults: 10, children: 4, infants: 0, pets: 0 };
    expect(maxFor("adults", mixed, LIMITS)).toBe(12);
    expect(maxFor("children", mixed, LIMITS)).toBe(6);
  });

  it("allows 5 infants and 5 pets whatever the party", () => {
    const full = { adults: 16, children: 0, infants: 0, pets: 0 };
    expect(maxFor("infants", full, LIMITS)).toBe(5);
    expect(maxFor("pets", full, LIMITS)).toBe(5);
  });

  it("lets adults go to zero only while nobody else is coming", () => {
    expect(minFor("adults", NO_GUESTS, LIMITS)).toBe(0);
    expect(minFor("adults", { ...NO_GUESTS, adults: 1, infants: 1 }, LIMITS)).toBe(1);
    expect(minFor("children", { ...NO_GUESTS, adults: 1, children: 1 }, LIMITS)).toBe(0);
  });
});

describe("setGuests", () => {
  it("changes one row", () => {
    expect(setGuests(NO_GUESTS, "adults", 2)).toEqual({ ...NO_GUESTS, adults: 2 });
  });

  it("brings an adult along with a child, an infant or a pet", () => {
    for (const kind of ["children", "infants", "pets"] as const) {
      expect(setGuests(NO_GUESTS, kind, 1)).toEqual({ ...NO_GUESTS, adults: 1, [kind]: 1 });
    }
  });

  it("does not pass a limit", () => {
    const full = { adults: 16, children: 0, infants: 5, pets: 5 };
    expect(setGuests(full, "adults", 17)).toEqual(full);
    expect(setGuests(full, "children", 1)).toEqual(full);
    expect(setGuests(full, "infants", 6)).toEqual(full);
    expect(setGuests(full, "pets", 6)).toEqual(full);
    expect(setGuests(NO_GUESTS, "adults", -1)).toEqual(NO_GUESTS);
  });

  it("keeps the last adult while a child is coming", () => {
    const party = { adults: 1, children: 1, infants: 0, pets: 0 };
    expect(setGuests(party, "adults", 0)).toEqual(party);
    expect(setGuests({ ...party, children: 0 }, "adults", 0)).toEqual(NO_GUESTS);
  });
});

describe("sanitizeGuests", () => {
  it("reads counts and drops what is not one", () => {
    expect(sanitizeGuests({ adults: 2, children: 1 })).toEqual({ adults: 2, children: 1, infants: 0, pets: 0 });
    expect(sanitizeGuests({ adults: -3, children: 1.5, infants: Number.NaN })).toEqual(NO_GUESTS);
    expect(sanitizeGuests({})).toEqual(NO_GUESTS);
  });

  it("brings every count inside its limit", () => {
    expect(sanitizeGuests({ adults: 99, children: 99, infants: 99, pets: 99 })).toEqual({
      adults: 16,
      children: 0,
      infants: 5,
      pets: 5,
    });
    expect(sanitizeGuests({ adults: 10, children: 10 })).toEqual({ adults: 10, children: 6, infants: 0, pets: 0 });
  });

  it("adds the adult a child needs, still inside the limit", () => {
    expect(sanitizeGuests({ children: 2 })).toEqual({ adults: 1, children: 2, infants: 0, pets: 0 });
    expect(sanitizeGuests({ children: 16 })).toEqual({ adults: 1, children: 15, infants: 0, pets: 0 });
  });
});

describe("guestSummary", () => {
  it("is null when nobody is chosen", () => {
    expect(guestSummary(NO_GUESTS)).toBeNull();
  });

  it("words the party as the original does (capture A5)", () => {
    expect(guestSummary({ adults: 16, children: 0, infants: 5, pets: 0 })).toBe("16 guests, 5 infants");
    expect(guestSummary({ adults: 1, children: 0, infants: 0, pets: 0 })).toBe("1 guest");
    expect(guestSummary({ adults: 1, children: 1, infants: 1, pets: 1 })).toBe("2 guests, 1 infant, 1 pet");
    expect(guestSummary({ adults: 2, children: 0, infants: 0, pets: 2 })).toBe("2 guests, 2 pets");
  });
});

describe("booking one listing", () => {
  it("is limited by the capacity of the listing and whether pets may come", () => {
    const small = listingLimits(LIMITS, { max_guests: 3, pets_allowed: false });
    expect(small).toMatchObject({ max_guests: 3, max_pets: 0, max_infants: 5 });
    const party = { adults: 2, children: 0, infants: 0, pets: 0 };
    expect(maxFor("adults", party, small)).toBe(3);
    expect(maxFor("children", party, small)).toBe(1);
    expect(maxFor("pets", party, small)).toBe(0);
    expect(setGuests(party, "children", 5, small)).toEqual({ ...party, children: 1 });

    const huge = listingLimits(LIMITS, { max_guests: 40, pets_allowed: true });
    expect(huge).toMatchObject({ max_guests: 16, max_pets: 5 });
  });

  it("always keeps one adult", () => {
    expect(minForBooking("adults", LIMITS)).toBe(1);
    expect(minForBooking("children", LIMITS)).toBe(0);
  });
});
