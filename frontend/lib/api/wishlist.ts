import type { WishlistIds } from "@/types/api";
import { api } from "./client";

export const getSavedIds = () => api<WishlistIds>("/wishlist/ids");

export const saveListing = (listingId: number) =>
  api<void>(`/wishlist/${listingId}`, { method: "PUT" });

export const unsaveListing = (listingId: number) =>
  api<void>(`/wishlist/${listingId}`, { method: "DELETE" });
