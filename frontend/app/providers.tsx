"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SessionHandoff } from "@/components/layout/session-handoff";
import { SessionProvider } from "@/components/layout/session-provider";
import { ToastProvider } from "@/components/ui/toast";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // lib/api already retries what is safe to repeat; a second layer would multiply it.
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** One client per server render; one for the life of the page in the browser. */
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/** The two contexts of the app (plan §7.4 rule 5): the current user and toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <ToastProvider>
        <SessionProvider>
          <SessionHandoff />
          {children}
        </SessionProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
