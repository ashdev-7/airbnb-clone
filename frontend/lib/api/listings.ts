import type { ListingPage } from "@/types/api";
import { serverApi } from "./server";

/**
 * One page of listings, for Server Components. `query` is the API query string of a
 * search (lib/search-params.ts: apiQuery); empty for the whole catalogue.
 */
export function fetchListings(query: string): Promise<ListingPage> {
  return serverApi<ListingPage>(query ? `/listings?${query}` : "/listings");
}
