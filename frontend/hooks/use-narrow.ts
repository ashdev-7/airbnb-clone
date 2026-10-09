"use client";

import { useSyncExternalStore } from "react";

/** Below Tailwind's `md`: a phone. The same number as the `max-md:` classes use. */
export const NARROW_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * True on a phone-width window. Layout is done in CSS wherever it can be; this is for the
 * few things CSS cannot do, such as how many months a calendar draws. The server does not
 * know the window, so it draws the wide form, and a phone corrects it once attached.
 */
export function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}
