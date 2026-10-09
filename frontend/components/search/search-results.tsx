import Link from "next/link";
import { connection } from "next/server";
import { ListingGrid, ListingGridSkeleton } from "@/components/listings/listing-grid";
import { ResultsMap } from "@/components/listings/results-map";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListings } from "@/lib/api/listings";
import { isValidStay, today } from "@/lib/dates";
import { formatHomes, shortPlace } from "@/lib/format";
import {
  NO_FILTERS,
  activeFilterCount,
  apiQuery,
  filtersOf,
  listingHref,
  parseSearch,
  searchHref,
  type RawParams,
} from "@/lib/search-params";

type Props = { location?: Promise<string>; searchParams: Promise<RawParams> };

/*
 * Capture B1: the results fill a 680 px column (two cards), the map takes the rest,
 * 48 px to its right, and stays in view while the results scroll.
 */
const LAYOUT = "grid gap-x-12 px-gutter lg:grid-cols-[680px_minmax(0,1fr)]";
const MAP =
  "sticky top-[191px] mt-10 mb-6 hidden h-[calc(100vh-215px)] overflow-hidden rounded-card lg:block";
const HEADING = "text-xl leading-6 font-semibold tracking-[-0.18px]";

/**
 * Search results (plan §6.5): the explore view with the search applied and a map beside
 * it. Everything it shows comes from the address: the place from the path, the dates,
 * guests, filters and page from the parameters (lib/search-params.ts).
 */
export async function SearchResults({ location, searchParams }: Props) {
  // The page depends on today's date, so it is rendered for each request, never ahead of time.
  await connection();
  let search = parseSearch(location ? decodeURIComponent(await location) : undefined, await searchParams);

  // Dates that have passed, or are too far ahead, would be refused by the API. An old
  // link then shows the place for any dates instead of an error.
  const staleDates =
    search.checkIn !== null &&
    search.checkOut !== null &&
    !isValidStay(search.checkIn, search.checkOut, today());
  if (staleDates) search = { ...search, checkIn: null, checkOut: null };

  const results = await fetchListings(apiQuery(search));
  const place = search.location ? shortPlace(search.location) : "India";
  const hasFilters = activeFilterCount(filtersOf(search)) > 0;

  if (results.items.length === 0) {
    const pastTheEnd = results.total > 0;
    return (
      <main className="flex flex-1 flex-col items-center gap-4 px-gutter py-24 text-center">
        <h1 className={HEADING}>{pastTheEnd ? "There is no such page" : "No homes match your search"}</h1>
        {!pastTheEnd && <p className="text-muted">Try other dates, fewer guests or a different place.</p>}
        {pastTheEnd ? (
          <Link href={searchHref({ ...search, page: 1 })} className="font-medium underline">
            Back to the first page
          </Link>
        ) : hasFilters ? (
          <Link
            href={searchHref({ ...search, ...NO_FILTERS, page: 1 })}
            className="rounded-control border border-ink px-6 py-3 font-medium hover:bg-surface"
          >
            Remove all filters
          </Link>
        ) : (
          <Link href="/s/homes" className="font-medium underline">
            Search everywhere
          </Link>
        )}
      </main>
    );
  }

  const hrefs = Object.fromEntries(results.items.map((item) => [item.id, listingHref(item.id, search)]));

  return (
    <main className={LAYOUT}>
      <div className="pt-8 pb-12">
        <h1 className={HEADING}>
          {formatHomes(results.total)}
          {search.location && ` in ${place}`}
        </h1>
        {staleDates && (
          <p className="pt-2 text-muted">
            Those dates can no longer be booked; showing homes for any dates.
          </p>
        )}
        <div className="pt-8">
          <ListingGrid listings={results.items} size="results" hrefs={hrefs} />
        </div>
        <div className="mt-[74px]">
          <Pagination
            page={results.page}
            totalPages={results.total_pages}
            hrefFor={(page) => searchHref({ ...search, page })}
            label="Search results pagination"
          />
        </div>
      </div>
      <aside className={MAP}>
        <ResultsMap listings={results.items} hrefs={hrefs} placeLabel={place} />
      </aside>
    </main>
  );
}

/** The loading state (plan §6.13): skeleton cards and a placeholder where the map goes. */
export function SearchResultsSkeleton() {
  return (
    <main className={LAYOUT}>
      <div className="pt-8 pb-12">
        <Skeleton className="h-6 w-40" />
        <div className="pt-8">
          <ListingGridSkeleton size="results" count={6} />
        </div>
      </div>
      <aside className={MAP}>
        <Skeleton className="h-full w-full !rounded-card" />
      </aside>
    </main>
  );
}
