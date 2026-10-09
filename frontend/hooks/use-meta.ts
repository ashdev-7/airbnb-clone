"use client";

import { useQuery } from "@tanstack/react-query";
import { getMeta } from "@/lib/api/catalogue";
import { DEFAULT_GUEST_LIMITS, type GuestLimits } from "@/lib/guests";

/** The catalogue's fixed lists. They change only with a deploy, so they are fetched once. */
export function useMeta() {
  const query = useQuery({ queryKey: ["meta"], queryFn: getMeta, staleTime: Infinity });
  const guestLimits: GuestLimits = query.data?.guest_limits ?? DEFAULT_GUEST_LIMITS;
  return { meta: query.data, guestLimits, isLoading: query.isPending };
}
