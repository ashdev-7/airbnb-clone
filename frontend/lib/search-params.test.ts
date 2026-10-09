import { describe, expect, it } from "vitest";
import {
  EMPTY_SEARCH,
  NO_FILTERS,
  activeFilterCount,
  apiQuery,
  filtersOf,
  listingHref,
  listingTarget,
  locationFromPath,
  pageHref,
  parsePage,
  parseSearch,
  searchHref,
  toggled,
  type RawParams,
  type SearchState,
} from "./search-params";

const FULL: SearchState = {
  location: "Goa, India",
  checkIn: "2026-10-29",
  checkOut: "2026-11-02",
  guests: { adults: 2, children: 1, infants: 1, pets: 1 },
  priceMin: 2000,
  priceMax: 9000,
  propertyTypes: ["cabin", "villa"],
  amenities: ["pool", "wifi"],
  minBedrooms: 2,
  minBeds: 3,
  minBathrooms: 1,
  petsAllowed: true,
  page: 3,
};

/** Reads an address the way a page does: the place from the path, the rest as raw parameters. */
function read(href: string): SearchState {
  const url = new URL(href, "http://airstay.test");
  const params: RawParams = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0];
  }
  return parseSearch(locationFromPath(url.pathname), params);
}

describe("round trip", () => {
  it("state → address → state is the same state", () => {
    for (const state of [
      EMPTY_SEARCH,
      FULL,
      { ...EMPTY_SEARCH, location: "Manali" },
      { ...EMPTY_SEARCH, guests: { adults: 4, children: 0, infants: 0, pets: 0 } },
      { ...EMPTY_SEARCH, priceMax: 5000, amenities: ["wifi"] },
      { ...EMPTY_SEARCH, location: "Dadra & Nagar Haveli / Daman", page: 2 },
    ]) {
      expect(read(searchHref(state))).toEqual(state);
    }
  });

  it("uses the parameter names of the captures", () => {
    const href = searchHref(FULL);
    expect(href.startsWith("/s/Goa%2C%20India/homes?")).toBe(true);
    const query = new URL(href, "http://x").searchParams;
    expect(query.get("checkin")).toBe("2026-10-29");
    expect(query.get("checkout")).toBe("2026-11-02");
    expect(query.get("adults")).toBe("2");
    expect(query.get("min_bedrooms")).toBe("2");
    expect(query.getAll("property_type")).toEqual(["cabin", "villa"]);
    expect(query.getAll("amenities")).toEqual(["pool", "wifi"]);
  });

  it("gives an empty search the bare address, and equal searches equal addresses", () => {
    expect(searchHref(EMPTY_SEARCH)).toBe("/s/homes");
    expect(searchHref({ ...FULL, amenities: ["wifi", "pool"] })).toBe(searchHref(FULL));
  });
});

describe("parseSearch drops what is malformed", () => {
  it("dates: both or neither, real days, in order", () => {
    for (const params of [
      { checkin: "2026-10-29" },
      { checkout: "2026-10-30" },
      { checkin: "2026-10-30", checkout: "2026-10-29" },
      { checkin: "2026-10-29", checkout: "2026-10-29" },
      { checkin: "2026-02-30", checkout: "2026-03-02" },
      { checkin: "tomorrow", checkout: "2026-10-30" },
    ]) {
      const state = parseSearch(undefined, params);
      expect([state.checkIn, state.checkOut]).toEqual([null, null]);
    }
  });

  it("guests, rooms, slugs and page", () => {
    const state = parseSearch("  Goa ", {
      adults: "99",
      children: "x",
      min_bedrooms: "-2",
      min_beds: "500",
      property_type: ["villa", "Villa!", "villa", "../etc"],
      amenities: "wifi",
      page: "0",
    });
    expect(state.location).toBe("Goa");
    expect(state.guests).toEqual({ adults: 16, children: 0, infants: 0, pets: 0 });
    expect(state.minBedrooms).toBe(0);
    expect(state.minBeds).toBe(50);
    expect(state.propertyTypes).toEqual(["villa"]);
    expect(state.amenities).toEqual(["wifi"]);
    expect(state.page).toBe(1);
  });

  it("puts a reversed price range the right way round", () => {
    const state = parseSearch(undefined, { price_min: "9000", price_max: "2000" });
    expect([state.priceMin, state.priceMax]).toEqual([2000, 9000]);
  });
});

describe("apiQuery", () => {
  it("translates to the names of the API, with prices in paise", () => {
    const query = new URLSearchParams(apiQuery(FULL));
    expect(Object.fromEntries(query)).toMatchObject({
      location: "Goa, India",
      check_in: "2026-10-29",
      check_out: "2026-11-02",
      adults: "2",
      children: "1",
      infants: "1",
      pets: "1",
      min_price_minor: "200000",
      max_price_minor: "900000",
      min_bedrooms: "2",
      min_beds: "3",
      min_bathrooms: "1",
      page: "3",
    });
    expect(query.getAll("property_type")).toEqual(["cabin", "villa"]);
    expect(query.getAll("amenity")).toEqual(["pool", "wifi"]);
  });

  it("asks for homes that allow pets when the filter is on, even with no pet among the guests", () => {
    const state = { ...EMPTY_SEARCH, petsAllowed: true };
    expect(apiQuery(state)).toBe("pets=1");
    expect(searchHref(state)).toBe("/s/homes?pets_allowed=true");
    expect(apiQuery({ ...state, guests: { adults: 2, children: 0, infants: 0, pets: 3 } })).toBe(
      "adults=2&pets=3",
    );
    expect(apiQuery({ ...EMPTY_SEARCH, petsAllowed: false })).toBe("");
  });

  it("is empty for an empty search, and can leave the page out", () => {
    expect(apiQuery(EMPTY_SEARCH)).toBe("");
    expect(new URLSearchParams(apiQuery(FULL, false)).has("page")).toBe(false);
  });
});

describe("filters", () => {
  it("counts each active filter", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount(filtersOf(FULL))).toBe(9); // price, 2 types, 2 amenities, 3 rooms, pets
    expect(activeFilterCount({ ...NO_FILTERS, priceMin: 1000 })).toBe(1);
  });

  it("toggles a slug in a sorted list", () => {
    expect(toggled(["pool"], "wifi")).toEqual(["pool", "wifi"]);
    expect(toggled(["pool", "wifi"], "pool")).toEqual(["wifi"]);
    expect(toggled(["wifi"], "pool")).toEqual(["pool", "wifi"]);
  });
});

describe("parsePage and pageHref", () => {
  it("reads a page number and falls back to the first page", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "9"])).toBe(2);
    for (const value of [undefined, "", "0", "-1", "abc", "1.5", "2e3", " 2", "9999999"]) {
      expect(parsePage(value)).toBe(1);
    }
  });

  it("gives page 1 the bare address", () => {
    expect(pageHref("/", 1)).toBe("/");
    expect(pageHref("/", 4)).toBe("/?page=4");
  });
});

describe("listing links", () => {
  it("point at the listing page and a tab named after the listing (capture B1)", () => {
    expect(listingHref(12)).toBe("/rooms/12");
    expect(listingTarget(12)).toBe("listing_12");
  });

  it("carry the dates and guests of the search, in the names of the listing page (capture C2)", () => {
    expect(listingHref(12, FULL)).toBe(
      "/rooms/12?check_in=2026-10-29&check_out=2026-11-02&adults=2&children=1&infants=1&pets=1",
    );
    expect(listingHref(12, EMPTY_SEARCH)).toBe("/rooms/12");
  });
});

describe("locationFromPath", () => {
  it("reads the place from a search path only", () => {
    expect(locationFromPath("/s/Goa%2C%20India/homes")).toBe("Goa, India");
    expect(locationFromPath("/s/homes")).toBeUndefined();
    expect(locationFromPath("/")).toBeUndefined();
    expect(locationFromPath("/s/%E0%A4%A/homes")).toBeUndefined();
  });
});
