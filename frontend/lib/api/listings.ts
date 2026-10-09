import type { ListingPage } from "@/types/api";
import { serverApi } from "./server";

/** One page of the catalogue, for Server Components. Filters join in Phase 6. */
export function fetchListings(page: number): Promise<ListingPage> {
  return serverApi<ListingPage>(`/listings?page=${page}`);
}
