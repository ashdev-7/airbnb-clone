"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Globe, Map } from "lucide-react";
import { useDeferredValue } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocations } from "@/lib/api/catalogue";
import { formatHomes } from "@/lib/format";
import type { LocationSuggestion } from "@/types/api";

const ICONS = { city: Building2, state: Map, country: Globe };

type Props = { text: string; onChoose: (label: string) => void };

/**
 * The "Where" panel (capture A3): 425 px wide under the left of the bar; rows of a 56 px
 * tile, a 14 px medium name and a grey line under it. The places come from our own
 * listings (plan §6.4): the busiest cities at first, then matches for what is typed.
 */
export function WherePanel({ text, onChoose }: Props) {
  const query = useDeferredValue(text.trim());
  const suggestions = useQuery({
    queryKey: ["locations", query],
    queryFn: () => getLocations(query),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
  const items: LocationSuggestion[] = suggestions.data?.items ?? [];

  return (
    <div className="max-h-[min(491px,calc(100vh-200px))] w-[425px] overflow-y-auto px-2 py-6 max-md:w-full">
      <p className="mb-1 px-6 text-xs leading-4">
        {query ? "Matching destinations" : "Suggested destinations"}
      </p>
      {suggestions.isPending && (
        <div className="grid gap-4 px-6 py-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-control" />
          ))}
        </div>
      )}
      {suggestions.isError && <p className="px-6 py-4 text-muted">Suggestions could not be loaded.</p>}
      {suggestions.isSuccess && items.length === 0 && (
        <p className="px-6 py-4 text-muted">
          No place we know matches “{query}”. You can still search for it.
        </p>
      )}
      <ul>
        {items.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <li key={`${item.kind}:${item.label}`}>
              <button
                type="button"
                onClick={() => onChoose(item.label)}
                className="flex w-full items-center gap-4 rounded-control px-6 py-2 text-left hover:bg-surface"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-control bg-[#f4f4f4]">
                  <Icon size={26} strokeWidth={1.5} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm leading-[18px] font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-sm leading-[18px] text-muted">
                    {formatHomes(item.listing_count)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
