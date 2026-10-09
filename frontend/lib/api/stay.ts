import type { Availability, Quote, ReviewPage } from "@/types/api";
import { api } from "./client";

/** The nights already booked on a listing, for its calendar. */
export const getAvailability = (listingId: number) =>
  api<Availability>(`/listings/${listingId}/availability`);

/** The price of a stay. `query` comes from quoteQuery (lib/stay-params.ts). */
export const getQuote = (listingId: number, query: string) =>
  api<Quote>(`/listings/${listingId}/quote?${query}`);

export const getReviews = (listingId: number, page: number) =>
  api<ReviewPage>(`/listings/${listingId}/reviews?page=${page}`);
