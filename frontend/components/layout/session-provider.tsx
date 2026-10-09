"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { getMe, login, logout } from "@/lib/api/auth";
import { storeFlash, storePendingAction, type PendingAction } from "@/lib/session-handoff";
import type { User } from "@/types/api";
import { LoginModal } from "./login-modal";

export type Session = {
  user: User | null;
  /** True until the first answer about who is signed in has arrived. */
  isLoading: boolean;
  /** Opens the account picker. `after` is what to do once signed in. */
  requestLogin: (after?: PendingAction) => void;
  signIn: (account: User) => Promise<void>;
  signOut: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

export const ME_QUERY_KEY = ["me"] as const;

/**
 * The current user, and the account picker that changes it. The server decides who the
 * user is (the signed cookie); this only mirrors its answer.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const me = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, staleTime: Infinity });
  const [loginOpen, setLoginOpen] = useState(false);
  const [after, setAfter] = useState<PendingAction | null>(null);

  const requestLogin = useCallback((action?: PendingAction) => {
    setAfter(action ?? null);
    setLoginOpen(true);
  }, []);

  // Each of these ends with a full page load, so every part of the page, on the server
  // and in the browser, is rebuilt for the new user (plan §19, 2026-10-09).
  const signIn = useCallback(
    async (account: User) => {
      await login(account.id);
      storeFlash(`Signed in as ${account.name}`);
      if (after?.kind === "visit") {
        window.location.assign(after.href);
        return;
      }
      if (after) storePendingAction(after);
      window.location.reload();
    },
    [after],
  );

  const signOut = useCallback(async () => {
    await logout();
    storeFlash("Logged out");
    // A full load on purpose (see above), so the router is not the right tool here.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }, []);

  const session = useMemo<Session>(
    () => ({
      user: me.data?.user ?? null,
      isLoading: me.isPending,
      requestLogin,
      signIn,
      signOut,
    }),
    [me.data, me.isPending, requestLogin, signIn, signOut],
  );

  return (
    <SessionContext.Provider value={session}>
      {children}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onChoose={signIn} />
    </SessionContext.Provider>
  );
}
