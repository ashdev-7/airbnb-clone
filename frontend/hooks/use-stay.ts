"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RawParams } from "@/lib/search-params";
import { parseStay, stayHref, type StayModal, type StayState } from "@/lib/stay-params";

/**
 * How many views we have opened over the page with a new history entry. While it is above
 * zero, closing a view is "Back"; after a reload or on a shared link it is zero, and
 * closing rewrites the address instead, so the visitor is never sent off the page.
 */
let openedViews = 0;

type Pending = { href: string; state: StayState };

/**
 * The stay being planned on a listing page: its dates, guests, and what is open over the
 * page. It lives in the URL (plan §7.4 rule 3), so every part of the page that shows or
 * changes it (the booking card, the calendar section, the sticky bar) agrees without
 * sharing any state.
 *
 * The address changes a moment after it is asked to. Until it has, the part of the page
 * that asked shows the stay it asked for, and builds the next change on that, so that
 * quick clicks (the "+" of a stepper, the arrow keys in a photo) each count.
 */
export function useStay(listingId: number) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromUrl = useMemo(() => {
    const params: RawParams = {};
    for (const [key, value] of searchParams) params[key] = value;
    return parseStay(params);
  }, [searchParams]);
  const urlHref = stayHref(listingId, fromUrl);

  const [pending, setPending] = useState<Pending | null>(null);
  // Once the address shows what was asked for, the address is the truth again. (State is
  // adjusted while rendering, as React recommends for state that follows other values.)
  const arrived = pending !== null && pending.href === urlHref;
  if (arrived) setPending(null);

  const stay = pending && !arrived ? pending.state : fromUrl;
  const latest = useRef(stay);
  useEffect(() => {
    latest.current = stay;
  });

  const go = useCallback(
    (next: StayState, how: "replace" | "push") => {
      const href = stayHref(listingId, next);
      latest.current = next;
      setPending({ href, state: next });
      if (how === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [router, listingId],
  );

  /** Changes dates, guests or the photo on show, in place: no new history entry. */
  const setStay = useCallback(
    (change: Partial<StayState>) => go({ ...latest.current, ...change }, "replace"),
    [go],
  );

  /** Opens a view over the page as a new history entry, so that Back closes it. */
  const openModal = useCallback(
    (modal: Exclude<StayModal, null>, photo = 0) => {
      openedViews += 1;
      go({ ...latest.current, modal, photo }, "push");
    },
    [go],
  );

  /** Closes the view on top. `fallback` is what lies under it when we cannot go back. */
  const closeModal = useCallback(
    (fallback: StayModal = null) => {
      if (openedViews > 0) {
        openedViews -= 1;
        setPending(null);
        router.back();
      } else {
        go({ ...latest.current, modal: fallback }, "replace");
      }
    },
    [router, go],
  );

  return { stay, setStay, openModal, closeModal };
}
