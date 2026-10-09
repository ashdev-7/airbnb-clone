import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingCard as Listing } from "@/types/api";
import { ListingCard, type CardSize } from "./listing-card";

/*
 * results: the cards of capture B1 beside the map: two columns, 24 px apart, 40 px between
 * rows. home: the small cards of capture A1 in a grid; the home page itself shows them in
 * rows (listing-row.tsx).
 */
const GRID: Record<CardSize, string> = {
  home: "grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-3 gap-y-8",
  results: "grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2",
};
const EAGER_CARDS: Record<CardSize, number> = { home: 6, results: 4 };

function Grid({ size, children }: { size: CardSize; children: ReactNode }) {
  return <div className={`grid ${GRID[size]}`}>{children}</div>;
}

type Props = {
  listings: Listing[];
  size: CardSize;
  /** The address of each listing page by id, when it carries the dates and guests of a search. */
  hrefs?: Record<number, string>;
};

export function ListingGrid({ listings, size, hrefs }: Props) {
  return (
    <Grid size={size}>
      {listings.map((listing, index) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          size={size}
          href={hrefs?.[listing.id]}
          eager={index < EAGER_CARDS[size]}
        />
      ))}
    </Grid>
  );
}

/** The loading state of the grid: cards of the same shape, without content. */
export function ListingGridSkeleton({ size, count = 18 }: { size: CardSize; count?: number }) {
  const photo = size === "home" ? "aspect-[20/19]" : "aspect-[4/3]";
  return (
    <div role="status" aria-label="Loading homes">
      <Grid size={size}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index}>
            <Skeleton className={`${photo} !rounded-card`} />
            <Skeleton className="mx-1 mt-3 h-4 w-2/3" />
            <Skeleton className="mx-1 mt-1 h-4 w-5/6" />
            <Skeleton className="mx-1 mt-1 h-4 w-1/3" />
          </div>
        ))}
      </Grid>
    </div>
  );
}
