"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { locationFromPath, parseSearch, type RawParams, type SearchState } from "@/lib/search-params";

/**
 * The search the address bar describes. On pages that are not a search (the home page)
 * it is the empty search. The URL is the only copy of this state (plan §7.4 rule 3).
 */
export function useSearchState(): SearchState {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const location = locationFromPath(pathname);
    const onSearchPage = location !== undefined || pathname === "/s/homes";
    const params: RawParams = {};
    if (onSearchPage) {
      for (const key of new Set(searchParams.keys())) {
        const values = searchParams.getAll(key);
        params[key] = values.length > 1 ? values : values[0];
      }
    }
    return parseSearch(location, params);
  }, [pathname, searchParams]);
}
