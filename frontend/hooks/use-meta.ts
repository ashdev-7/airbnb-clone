"use client";

import { useQuery } from "@tanstack/react-query";
import { getMeta } from "@/lib/api/catalogue";
import { DEFAULT_GUEST_LIMITS, type GuestLimits } from "@/lib/guests";
import { useHydrated } from "./use-hydrated";

/** The catalogue's fixed lists. They change only with a deploy, so they are fetched once. */
export function useMeta() {
  const query = useQuery({ queryKey: ["meta"], queryFn: getMeta, staleTime: Infinity });
  // The server draws the page without these lists; start from that (see useHydrated).
  const hydrated = useHydrated();
  const meta = hydrated ? query.data : undefined;
  const guestLimits: GuestLimits = meta?.guest_limits ?? DEFAULT_GUEST_LIMITS;
  return { meta, guestLimits, isLoading: meta === undefined };
}
