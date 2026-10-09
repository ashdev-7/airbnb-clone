import type { ListingCard, WishlistIds } from "@/types/api";
import { api } from "./client";

/** The saved homes themselves, newest first, for the Wishlists page. */
export const getSavedListings = () => api<{ items: ListingCard[] }>("/wishlist");

export const getSavedIds = () => api<WishlistIds>("/wishlist/ids");

export const saveListing = (listingId: number) =>
  api<void>(`/wishlist/${listingId}`, { method: "PUT" });

export const unsaveListing = (listingId: number) =>
  api<void>(`/wishlist/${listingId}`, { method: "DELETE" });
