"use client";

import { useCallback } from "react";
import type { PendingAction } from "@/lib/session-handoff";
import { useCurrentUser } from "./use-current-user";

/**
 * The login gate (plan §6.1): run the action if someone is signed in; otherwise open the
 * account picker, which carries the action out after sign-in. Returns whether it ran.
 */
export function useLoginGate() {
  const { user, isLoading, requestLogin } = useCurrentUser();

  return useCallback(
    (action: PendingAction, run: () => void): boolean => {
      if (isLoading) return false; // not known yet: neither act nor ask
      if (user) {
        run();
        return true;
      }
      requestLogin(action);
      return false;
    },
    [user, isLoading, requestLogin],
  );
}
