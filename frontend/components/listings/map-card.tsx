"use client";

import { Star, X } from "lucide-react";
import Link from "next/link";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { formatMoney, formatRating, listingHeadline } from "@/lib/format";
import { listingTarget } from "@/lib/search-params";
import type { ListingCard } from "@/types/api";
import { WishlistHeart } from "./wishlist-heart";

type Props = { listing: ListingCard; href: string; onClose: () => void };

/**
 * The card a map marker opens (capture B4): 327 px wide, the photo on top with a heart
 * and a close button, then the same lines as a results card. It links to the listing.
 */
export function MapCard({ listing, href, onClose }: Props) {
  const headline = listingHeadline(listing.property_type.name, listing.city);

  return (
    <div className="relative w-[327px] overflow-hidden rounded-card bg-white font-sans text-ink">
      <Link href={href} target={listingTarget(listing.id)} className="block !text-ink">
        <div className="relative h-[209px] bg-line">
          {listing.photos[0] && <ImageWithFallback src={listing.photos[0]} alt={headline} sizes="327px" />}
        </div>
        <div className="p-3.5 text-[15px] leading-[19px]">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-medium">{headline}</h3>
            {listing.rating_average === null ? (
              <span className="shrink-0">New</span>
            ) : (
              <span className="flex shrink-0 items-center gap-1">
                <Star size={12} fill="currentColor" strokeWidth={0} aria-hidden />
                {formatRating(listing.rating_average)} ({listing.review_count})
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-muted">{listing.title}</div>
          <div className="mt-2 text-muted">
            <span className="font-medium text-ink">{formatMoney(listing.price_per_night_minor)}</span> per night
          </div>
        </div>
      </Link>
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <WishlistHeart listingId={listing.id} listingName={headline} />
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-white/90 shadow-control"
        >
          <X size={14} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
