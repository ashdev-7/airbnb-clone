/**
 * Panels that close on a click outside them (the search bar's panels, the booking card's)
 * must not treat a modal they opened as "outside": a modal is drawn in a portal at the end
 * of the page, away from the panel that opened it.
 */

/** Radix marks the content of an open modal or popover with `data-state="open"`. */
const OPEN_OVERLAY = '[role="dialog"][data-state="open"]';

/** True when the event happened inside an open modal or popover. */
export function inOverlay(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(OPEN_OVERLAY) !== null;
}

/** True while a modal is open: Escape then belongs to the modal, not to what is under it. */
export function overlayOpen(): boolean {
  return document.querySelector(OPEN_OVERLAY) !== null;
}
