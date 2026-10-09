"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Closes a modal, popover or menu when its route is hidden. With Cache Components a
 * route stays mounted after navigation, so without this the visitor would come back to
 * a menu that is still open (plan §19, 2026-10-09; Next.js "Preserving UI state").
 *
 * React runs an effect's cleanup when the route is hidden. In development it also runs
 * it once, and the effect again straight after, to test every component; the check one
 * microtask later tells the two apart, so a panel that is mounted open stays open.
 */
export function useCloseWhenHidden(close: () => void): void {
  const latest = useRef(close);
  const shown = useRef(false);

  useLayoutEffect(() => {
    latest.current = close;
  });

  useLayoutEffect(() => {
    shown.current = true;
    return () => {
      shown.current = false;
      queueMicrotask(() => {
        if (!shown.current) latest.current();
      });
    };
  }, []);
}
