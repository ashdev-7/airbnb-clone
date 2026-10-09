import type { ListingDetail, ListingPage, ReviewPage } from "@/types/api";
import { serverApi } from "./server";

/**
 * One page of listings, for Server Components. `query` is the API query string of a
 * search (lib/search-params.ts: apiQuery); empty for the whole catalogue.
 */
export function fetchListings(query: string): Promise<ListingPage> {
  return serverApi<ListingPage>(query ? `/listings?${query}` : "/listings");
}

/** One listing with its description, amenities and host. Throws ApiError 404 if it is gone. */
export function fetchListing(listingId: number): Promise<ListingDetail> {
  return serverApi<ListingDetail>(`/listings/${listingId}`);
}

/** The first reviews of a listing, newest first, with its rating. */
export function fetchReviews(listingId: number, pageSize: number): Promise<ReviewPage> {
  return serverApi<ReviewPage>(`/listings/${listingId}/reviews?page_size=${pageSize}`);
}
