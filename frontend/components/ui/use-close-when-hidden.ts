"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Closes a modal, popover or menu when its route is hidden. With Cache Components a
 * route stays mounted after navigation, so without this the visitor would come back to
 * a menu that is still open (plan §19, 2026-10-09; Next.js "Preserving UI state").
 */
export function useCloseWhenHidden(close: () => void): void {
  const latest = useRef(close);
  useLayoutEffect(() => {
    latest.current = close;
  });
  useLayoutEffect(() => () => latest.current(), []);
}
