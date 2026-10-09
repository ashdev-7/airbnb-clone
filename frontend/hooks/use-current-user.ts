"use client";

import { useContext } from "react";
import { SessionContext, type Session } from "@/components/layout/session-provider";

/** Who is signed in, and the ways to change that. */
export function useCurrentUser(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useCurrentUser needs <SessionProvider>");
  return session;
}
