import type { ListingSummary, LocationSuggestion, Meta } from "@/types/api";
import { api } from "./client";

/** Property types, amenities and guest limits: what the search controls are built from. */
export const getMeta = () => api<Meta>("/meta");

/** Place suggestions for "Where"; without text, the busiest cities. */
export const getLocations = (text: string) =>
  api<{ items: LocationSuggestion[] }>(`/locations?q=${encodeURIComponent(text)}`);

/** The count and price spread of a search. `query` comes from apiQuery (no page). */
export const getSummary = (query: string) =>
  api<ListingSummary>(query ? `/listings/summary?${query}` : "/listings/summary");
