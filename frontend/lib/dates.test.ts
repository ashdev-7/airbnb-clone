import { describe, expect, it } from "vitest";
import {
  addDays,
  fromLocalDate,
  isIsoDate,
  isSelectableCheckIn,
  isSelectableCheckOut,
  isValidStay,
  nightsBetween,
  selectDay,
  toLocalDate,
  today,
  type Stay,
} from "./dates";

const TODAY = "2026-10-09";
// A stay of five nights, and one that starts the day it ends (back to back).
const BOOKED: Stay[] = [
  { checkIn: "2026-10-19", checkOut: "2026-10-24" },
  { checkIn: "2026-10-24", checkOut: "2026-10-26" },
];

describe("ISO dates", () => {
  it("accepts real calendar days only", () => {
    expect(isIsoDate("2026-10-09")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    for (const value of ["2026-02-30", "2026-13-01", "2026-1-9", "09-10-2026", "", null, 20261009]) {
      expect(isIsoDate(value)).toBe(false);
    }
  });

  it("adds days and counts nights across months, years and leap days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-10-09", -9)).toBe("2026-09-30");
    expect(nightsBetween("2026-10-29", "2026-10-30")).toBe(1);
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("takes today from the time zone of the business, not of the visitor", () => {
    // 20:00 UTC on the 8th is already 01:30 on the 9th in India.
    const evening = new Date("2026-10-08T20:00:00Z");
    expect(today(evening, "Asia/Kolkata")).toBe("2026-10-09");
    expect(today(evening, "America/New_York")).toBe("2026-10-08");
  });

  it("converts to and from the calendar's local dates without drift", () => {
    for (const date of ["2026-01-01", "2026-03-29", "2026-10-25", "2026-12-31"]) {
      expect(fromLocalDate(toLocalDate(date))).toBe(date);
    }
  });
});

describe("check-in", () => {
  it("is today or later, with a night left inside the window", () => {
    expect(isSelectableCheckIn("2026-10-08", TODAY)).toBe(false);
    expect(isSelectableCheckIn("2026-10-09", TODAY)).toBe(true);
    expect(isSelectableCheckIn(addDays(TODAY, 729), TODAY)).toBe(true);
    expect(isSelectableCheckIn(addDays(TODAY, 730), TODAY)).toBe(false);
  });

  it("is not a booked night, but may be the day the last stay ends", () => {
    expect(isSelectableCheckIn("2026-10-18", TODAY, BOOKED)).toBe(true);
    expect(isSelectableCheckIn("2026-10-19", TODAY, BOOKED)).toBe(false);
    expect(isSelectableCheckIn("2026-10-23", TODAY, BOOKED)).toBe(false);
    expect(isSelectableCheckIn("2026-10-24", TODAY, BOOKED)).toBe(false); // the next stay starts
    expect(isSelectableCheckIn("2026-10-25", TODAY, BOOKED)).toBe(false);
    expect(isSelectableCheckIn("2026-10-26", TODAY, BOOKED)).toBe(true);
  });
});

describe("check-out", () => {
  it("is after check-in and inside the window", () => {
    expect(isSelectableCheckOut("2026-10-10", "2026-10-10", TODAY)).toBe(false);
    expect(isSelectableCheckOut("2026-10-09", "2026-10-10", TODAY)).toBe(false);
    expect(isSelectableCheckOut("2026-10-11", "2026-10-10", TODAY)).toBe(true);
    expect(isSelectableCheckOut(addDays(TODAY, 730), "2026-10-10", TODAY)).toBe(true);
    expect(isSelectableCheckOut(addDays(TODAY, 731), "2026-10-10", TODAY)).toBe(false);
  });

  it("may fall on the next booked check-in, and no later", () => {
    expect(isSelectableCheckOut("2026-10-18", "2026-10-16", TODAY, BOOKED)).toBe(true);
    expect(isSelectableCheckOut("2026-10-19", "2026-10-16", TODAY, BOOKED)).toBe(true);
    expect(isSelectableCheckOut("2026-10-20", "2026-10-16", TODAY, BOOKED)).toBe(false);
    expect(isSelectableCheckOut("2026-10-27", "2026-10-16", TODAY, BOOKED)).toBe(false);
  });

  it("is free after the last booked stay", () => {
    expect(isSelectableCheckOut("2026-11-05", "2026-10-26", TODAY, BOOKED)).toBe(true);
  });
});

describe("isValidStay", () => {
  it("joins both rules", () => {
    expect(isValidStay("2026-10-16", "2026-10-19", TODAY, BOOKED)).toBe(true);
    expect(isValidStay("2026-10-16", "2026-10-21", TODAY, BOOKED)).toBe(false);
    expect(isValidStay("2026-10-01", "2026-10-05", TODAY)).toBe(false);
    expect(isValidStay("2026-10-12", "2026-10-12", TODAY)).toBe(false);
  });
});

describe("selectDay", () => {
  const none = { checkIn: null, checkOut: null };

  it("sets check-in, then check-out on a later day", () => {
    const first = selectDay(none, "2026-10-10");
    expect(first).toEqual({ checkIn: "2026-10-10", checkOut: null });
    expect(selectDay(first, "2026-10-13")).toEqual({ checkIn: "2026-10-10", checkOut: "2026-10-13" });
  });

  it("starts again on an earlier or equal day, or once a range is complete", () => {
    const first = { checkIn: "2026-10-10", checkOut: null };
    expect(selectDay(first, "2026-10-08")).toEqual({ checkIn: "2026-10-08", checkOut: null });
    expect(selectDay(first, "2026-10-10")).toEqual({ checkIn: "2026-10-10", checkOut: null });
    const done = { checkIn: "2026-10-10", checkOut: "2026-10-13" };
    expect(selectDay(done, "2026-10-20")).toEqual({ checkIn: "2026-10-20", checkOut: null });
  });
});
