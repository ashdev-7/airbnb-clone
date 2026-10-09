"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatMoney, formatRating, listingHeadline } from "@/lib/format";
import { listingHref, listingTarget } from "@/lib/search-params";
import type { ListingCard as Listing } from "@/types/api";
import { CardPhotoControls, CardPhotoTrack } from "./card-photos";
import { WishlistHeart } from "./wishlist-heart";

type Props = { listing: Listing; eager?: boolean };

/**
 * A listing card, laid out as in capture B1: a 4:3 photo with 20 px corners, then 15 px
 * text 12 px below it. It shows what the assignment asks for (R-HS-1): photo, title,
 * location, price per night and rating. The whole card is one link to the listing; the
 * heart and the photo arrows sit above the link, so using them does not navigate.
 */
export function ListingCard({ listing, eager = false }: Props) {
  const [photo, setPhoto] = useState(0);
  const headline = listingHeadline(listing.property_type.name, listing.city);

  return (
    <article className="group relative">
      <Link
        href={listingHref(listing.id)}
        target={listingTarget(listing.id)}
        rel="noopener noreferrer"
        className="block rounded-card"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-line">
          <CardPhotoTrack photos={listing.photos} index={photo} alt={headline} eager={eager} />
        </div>

        <div className="mx-1 mt-3 text-[15px] leading-[19px]">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-medium">{headline}</h3>
            {listing.rating_average === null ? (
              <span className="shrink-0">New</span>
            ) : (
              <span
                className="flex shrink-0 items-center gap-1"
                aria-label={`${formatRating(listing.rating_average)} out of 5 average rating, ${listing.review_count} reviews`}
              >
                <Star size={12} fill="currentColor" strokeWidth={0} aria-hidden />
                <span aria-hidden>
                  {formatRating(listing.rating_average)} ({listing.review_count})
                </span>
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-muted">{listing.title}</p>
          <p className="mt-2">
            <span className="font-medium">{formatMoney(listing.price_per_night_minor)}</span>{" "}
            <span className="text-muted">per night</span>
          </p>
        </div>
      </Link>

      {/* Over the photo only: the box has the photo's shape and lets clicks through. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3]">
        <CardPhotoControls
          count={listing.photos.length}
          index={photo}
          onChange={setPhoto}
          name={headline}
        />
        <WishlistHeart
          listingId={listing.id}
          listingName={headline}
          className="pointer-events-auto absolute top-2.5 right-3"
        />
      </div>
    </article>
  );
}
