/**
 * Signing in, switching account and logging out end with a full page load (CLAUDE.md).
 * What has to survive that load is kept here, in sessionStorage: the action the visitor
 * was in the middle of, and the toast to show afterwards.
 */

export type PendingAction =
  | { kind: "save"; listingId: number }
  | { kind: "visit"; href: string };

const PENDING_KEY = "airstay:pending-action";
const FLASH_KEY = "airstay:flash";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // storage can be blocked; the hand-off is then simply skipped
  }
}

function take(store: Store | null, key: string): string | null {
  if (!store) return null;
  const value = store.getItem(key);
  store.removeItem(key);
  return value;
}

/** Only our own pages may be resumed: a path on this site, never another origin. */
function isLocalPath(href: unknown): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

export function parsePendingAction(text: string | null): PendingAction | null {
  if (!text) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const action = value as Record<string, unknown>;
  if (action.kind === "save" && Number.isInteger(action.listingId)) {
    return { kind: "save", listingId: action.listingId as number };
  }
  if (action.kind === "visit" && isLocalPath(action.href)) {
    return { kind: "visit", href: action.href };
  }
  return null;
}

export function storePendingAction(action: PendingAction, store = browserStore()): void {
  store?.setItem(PENDING_KEY, JSON.stringify(action));
}

export function takePendingAction(store = browserStore()): PendingAction | null {
  return parsePendingAction(take(store, PENDING_KEY));
}

export function storeFlash(message: string, store = browserStore()): void {
  store?.setItem(FLASH_KEY, message);
}

export function takeFlash(store = browserStore()): string | null {
  return take(store, FLASH_KEY);
}
