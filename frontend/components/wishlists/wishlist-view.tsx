"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { WishlistHeart } from "@/components/listings/wishlist-heart";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { useWishlist } from "@/hooks/use-wishlist";
import { getSavedListings } from "@/lib/api/wishlist";
import { formatMoney, listingHeadline } from "@/lib/format";
import { listingHref, listingTarget } from "@/lib/search-params";

/* Capture E2: tiles 302 px wide in a 1280 px page, 24 px apart, 40 px between rows. */
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(260px,302px))] gap-x-6 gap-y-10 pt-6";

function Message({ title, line, children }: { title: string; line: string; children: React.ReactNode }) {
  return (
    <div className="pt-6">
      <h2 className="text-[22px] leading-[26px] font-medium">{title}</h2>
      <p className="max-w-[480px] pt-2 pb-6 text-base leading-6 text-muted">{line}</p>
      {children}
    </div>
  );
}

/**
 * The saved homes of the current user: one list (assignment O6), drawn with the tiles of
 * capture E2: a 302 × 287 photo with 24 px corners and a soft shadow, a 14 px medium name
 * and a grey line under it. The heart on a tile removes it. Who the user is, is known in
 * the browser, so the list is fetched there.
 */
export function WishlistView() {
  const { user, isLoading, requestLogin } = useCurrentUser();
  const { isSaved } = useWishlist();
  const hydrated = useHydrated();
  const saved = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: getSavedListings,
    enabled: user !== null,
  });

  if (!hydrated || isLoading || (user && saved.isPending)) {
    return (
      <div className={GRID} role="status" aria-label="Loading your wishlist">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="aspect-[302/287] !rounded-3xl" />
        ))}
      </div>
    );
  }
  if (!user) {
    return (
      <Message title="Log in to view your wishlists" line="You can save homes with the heart on any listing once you are logged in.">
        <Button onClick={() => requestLogin()}>Log in</Button>
      </Message>
    );
  }
  if (saved.isError || !saved.data) {
    return (
      <Message title="Something went wrong" line="We could not load your saved homes.">
        <Button variant="dark" onClick={() => saved.refetch()}>
          Try again
        </Button>
      </Message>
    );
  }

  // A home leaves the page as soon as its heart is switched off.
  const items = saved.data.items.filter((listing) => isSaved(listing.id));
  if (items.length === 0) {
    return (
      <Message title="No saved homes yet" line="As you search, tap the heart on a home you like and it will be kept here.">
        <Link href="/" className="inline-flex h-12 items-center rounded-control bg-ink px-6 text-base font-medium text-paper">
          Start exploring
        </Link>
      </Message>
    );
  }

  return (
    <ul className={GRID}>
      {items.map((listing) => {
        const headline = listingHeadline(listing.property_type.name, listing.city);
        return (
          <li key={listing.id} className="relative">
            <Link href={listingHref(listing.id)} target={listingTarget(listing.id)} className="block">
              <div className="relative aspect-[302/287] overflow-hidden rounded-3xl bg-line shadow-[0_6px_16px_rgb(0_0_0/0.12)]">
                {listing.photos[0] && <ImageWithFallback src={listing.photos[0]} alt={headline} sizes="302px" />}
              </div>
              <h2 className="pt-3 text-sm leading-[18px] font-medium">{headline}</h2>
              <p className="text-sm leading-[18px] text-muted">
                {formatMoney(listing.price_per_night_minor)} per night
              </p>
            </Link>
            <WishlistHeart listingId={listing.id} listingName={headline} className="absolute top-3 right-3" />
          </li>
        );
      })}
    </ul>
  );
}
