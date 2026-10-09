"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";

type Props = { listingId: number; listingName: string; className?: string };

/**
 * The heart on a card (capture B1): a 32 px button holding a 24 px heart, dark and
 * translucent with a white outline; filled with the brand colour once saved. The shape
 * is Lucide's. Signed out, it opens the account picker and saves afterwards (plan §6.3).
 */
export function WishlistHeart({ listingId, listingName, className = "" }: Props) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(listingId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`${saved ? "Remove from wishlist" : "Add to wishlist"}: ${listingName}`}
      onClick={() => toggle(listingId)}
      className={`flex size-8 items-center justify-center rounded-full transition-transform active:scale-90 ${className}`}
    >
      <Heart
        size={24}
        strokeWidth={2}
        stroke="#ffffff"
        fill={saved ? "var(--color-brand)" : "rgb(0 0 0 / 0.5)"}
        aria-hidden
      />
    </button>
  );
}
