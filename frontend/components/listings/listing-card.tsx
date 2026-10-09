"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatMoney, formatRating, listingHeadline } from "@/lib/format";
import { listingHref, listingTarget } from "@/lib/search-params";
import type { ListingCard as Listing } from "@/types/api";
import { CardPhotoControls, CardPhotoTrack } from "./card-photos";
import { WishlistHeart } from "./wishlist-heart";

/**
 * Two sizes, each from its capture:
 * - "home": the small card of the home page (A1). Photo 20:19; 8 px below it the name of
 *   the place in 13 px medium (it may run to two lines), then one 12 px grey line with the
 *   price and, after a dot, the rating.
 * - "results": the card beside the map on the search page (B1). Photo 4:3; text 12 px
 *   below at 15 px; the rating sits at the right of the first line.
 */
export type CardSize = "home" | "results";

type Props = { listing: Listing; size: CardSize; eager?: boolean; href?: string };

const PHOTO: Record<CardSize, string> = { home: "aspect-[20/19]", results: "aspect-[4/3]" };
/** The badge over the photo (bonus B3). Home: capture A1; results: capture B1. */
const BADGE: Record<CardSize, string> = {
  home: "top-2.5 left-2.5 rounded-[14px] border border-white/50 bg-white/80 px-[9.5px] py-[5.5px] text-[11px] leading-[13px] font-semibold shadow-[0_2px_6px_rgb(0_0_0/0.04),0_4px_8px_rgb(0_0_0/0.1)]",
  results: "top-3 left-3 rounded-full border border-white bg-white px-2.5 py-1 text-sm leading-[18px] font-medium shadow-[0_4px_10px_rgb(0_0_0/0.16)]",
};
const HEART: Record<CardSize, string> = { home: "top-2 right-2", results: "top-2.5 right-3" };

/**
 * The price per night on every card; when the search has dates, the total for the stay
 * follows it (assignment O1). Both numbers come from the server.
 */
function Price({ listing }: { listing: Listing }) {
  return (
    <>
      <span className="leading-[normal] font-medium text-ink">{formatMoney(listing.price_per_night_minor)}</span>{" "}
      per night
      {listing.stay_total_minor !== null && (
        <>
          <span aria-hidden className="px-1 text-faint">
            ·
          </span>
          {formatMoney(listing.stay_total_minor)} total
        </>
      )}
    </>
  );
}

function Rating({ listing, withCount, star }: { listing: Listing; withCount: boolean; star: number }) {
  if (listing.rating_average === null) return <span>New</span>;
  const average = formatRating(listing.rating_average);
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`${average} out of 5 average rating, ${listing.review_count} reviews`}
    >
      <Star size={star} fill="currentColor" strokeWidth={0} aria-hidden />
      <span aria-hidden>{withCount ? `${average} (${listing.review_count})` : average}</span>
    </span>
  );
}

/**
 * A listing card. It shows what the assignment asks for (R-HS-1): photo, title, location,
 * price per night and rating. The whole card is one link to the listing; the heart and
 * the photo arrows sit above the link, so using them does not navigate.
 */
export function ListingCard({ listing, size, eager = false, href }: Props) {
  const [photo, setPhoto] = useState(0);
  const headline = listingHeadline(listing.property_type.name, listing.city);

  return (
    <article className="group relative">
      <Link
        href={href ?? listingHref(listing.id)}
        target={listingTarget(listing.id)}
       
        className="block rounded-card"
      >
        <div className={`relative overflow-hidden rounded-card bg-line ${PHOTO[size]}`}>
          <CardPhotoTrack photos={listing.photos} index={photo} alt={headline} eager={eager} size={size} />
        </div>

        {size === "home" ? (
          <div className="mx-1 mt-2 grid gap-0.5 text-xs leading-4 text-muted">
            <h3 className="text-[13px] font-medium text-ink">{headline}</h3>
            <p className="flex flex-wrap items-center gap-x-1">
              <span>{formatMoney(listing.price_per_night_minor)} per night</span>
              <span aria-hidden className="font-bold text-faint">
                ·
              </span>
              <Rating listing={listing} withCount={false} star={8} />
            </p>
          </div>
        ) : (
          <div className="mx-1 mt-3 text-[15px] leading-[19px]">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-medium">{headline}</h3>
              <span className="shrink-0">
                <Rating listing={listing} withCount star={12} />
              </span>
            </div>
            <p className="mt-0.5 truncate text-muted">{listing.title}</p>
            <p className="mt-2 text-muted">
              <Price listing={listing} />
            </p>
          </div>
        )}
      </Link>

      {/* Over the photo only: the box has the photo's shape and lets clicks through. */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 ${PHOTO[size]}`}>
        <CardPhotoControls
          count={listing.photos.length}
          index={photo}
          onChange={setPhoto}
          name={headline}
        />
        {listing.guest_favourite && <span className={`absolute text-[#222222] ${BADGE[size]}`}>Guest favourite</span>}
        <WishlistHeart
          listingId={listing.id}
          listingName={headline}
          className={`pointer-events-auto absolute ${HEART[size]}`}
        />
      </div>
    </article>
  );
}
