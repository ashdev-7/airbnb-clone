"use client";

import { useContext } from "react";
import { SessionContext, type Session } from "@/components/layout/session-provider";
import { useHydrated } from "./use-hydrated";

/**
 * Who is signed in, and the ways to change that. The server never knows the user when it
 * draws a page, so until this part of the page is attached the answer is "not known yet"
 * (see useHydrated).
 */
export function useCurrentUser(): Session {
  const session = useContext(SessionContext);
  const hydrated = useHydrated();
  if (!session) throw new Error("useCurrentUser needs <SessionProvider>");
  return hydrated ? session : { ...session, user: null, isLoading: true };
}
