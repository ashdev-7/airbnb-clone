import { describe, expect, it } from "vitest";
import {
  parsePendingAction,
  storeFlash,
  storePendingAction,
  takeFlash,
  takePendingAction,
} from "./session-handoff";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    size: () => values.size,
  };
}

describe("pending action", () => {
  it("survives the page load once, then is gone", () => {
    const store = memoryStore();
    storePendingAction({ kind: "save", listingId: 12 }, store);
    expect(takePendingAction(store)).toEqual({ kind: "save", listingId: 12 });
    expect(takePendingAction(store)).toBeNull();
    expect(store.size()).toBe(0);
  });

  it("keeps a page to return to", () => {
    const store = memoryStore();
    storePendingAction({ kind: "visit", href: "/trips" }, store);
    expect(takePendingAction(store)).toEqual({ kind: "visit", href: "/trips" });
  });

  it("ignores anything it did not write itself", () => {
    for (const text of [
      null,
      "",
      "not json",
      "null",
      "[]",
      '{"kind":"save"}',
      '{"kind":"save","listingId":"12"}',
      '{"kind":"save","listingId":1.5}',
      '{"kind":"delete","listingId":1}',
    ]) {
      expect(parsePendingAction(text)).toBeNull();
    }
  });

  it("never resumes to another site", () => {
    for (const href of ["https://example.com", "//example.com", "javascript:alert(1)", "trips"]) {
      expect(parsePendingAction(JSON.stringify({ kind: "visit", href }))).toBeNull();
    }
  });

  it("does nothing when storage is unavailable", () => {
    expect(() => storePendingAction({ kind: "save", listingId: 1 }, null)).not.toThrow();
    expect(takePendingAction(null)).toBeNull();
  });
});

describe("flash message", () => {
  it("is read once", () => {
    const store = memoryStore();
    storeFlash("Signed in as Meera", store);
    expect(takeFlash(store)).toBe("Signed in as Meera");
    expect(takeFlash(store)).toBeNull();
  });
});
