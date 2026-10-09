import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingCard as Listing } from "@/types/api";
import { ListingCard } from "./listing-card";

/** The first row is on screen at once, so its photos are loaded eagerly. */
const EAGER_CARDS = 4;

/**
 * Cards across the full width (plan §6.3). Card width and gaps follow capture B1: about
 * 328 px wide, 24 px between columns, 40 px between rows. The grid fits as many columns
 * of at least 270 px as the width allows, which gives four at the captured window.
 */
function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-x-6 gap-y-10">
      {children}
    </div>
  );
}

export function ListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <Grid>
      {listings.map((listing, index) => (
        <ListingCard key={listing.id} listing={listing} eager={index < EAGER_CARDS} />
      ))}
    </Grid>
  );
}

/** The loading state of the grid: cards of the same shape, without content. */
export function ListingGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading homes">
      <Grid>
        {Array.from({ length: count }, (_, index) => (
          <div key={index}>
            <Skeleton className="aspect-[4/3] !rounded-card" />
            <Skeleton className="mx-1 mt-3 h-[19px] w-2/3" />
            <Skeleton className="mx-1 mt-1 h-[19px] w-5/6" />
            <Skeleton className="mx-1 mt-2 h-[19px] w-1/3" />
          </div>
        ))}
      </Grid>
    </div>
  );
}
