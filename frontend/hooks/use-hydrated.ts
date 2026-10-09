"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and while React is attaching to the server's HTML; true from the
 * render after that.
 *
 * Parts of a page are attached at different moments (each Suspense boundary on its own),
 * and a request made by a part attached early, such as "who is signed in", can be
 * answered before a later part is attached. That later part must still begin with what
 * the server drew: React does not correct attributes that differ, so a heart drawn
 * "not saved" would stay that way. Hooks that read data fetched in the browser start
 * from the server's answer until this is true.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
