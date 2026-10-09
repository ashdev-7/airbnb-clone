import Link from "next/link";
import { Suspense } from "react";
import { ListingGrid, ListingGridSkeleton } from "@/components/listings/listing-grid";
import { Pagination } from "@/components/ui/pagination";
import { FilterRow } from "@/components/search/filter-row";
import { fetchListings } from "@/lib/api/listings";
import { pageHref, parsePage } from "@/lib/search-params";

const HOME = "/";

/**
 * Home: the explore view (plan §6.3, D10), inside the 88 px margins of capture A1. The
 * page number lives in the URL and the grid is rendered on the server; the skeleton shows while the listings are on their way.
 */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main className="px-[88px] pb-12">
      <h1 className="sr-only">Explore homes</h1>
      {/* Using a filter here opens the search page with it applied (plan §6.3). */}
      <div className="py-3">
        <Suspense fallback={<div className="h-[54px]" />}>
          <FilterRow />
        </Suspense>
      </div>
      <Suspense fallback={<ListingGridSkeleton size="home" />}>
        <Explore searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Explore({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const page = parsePage((await searchParams).page);
  const results = await fetchListings(page > 1 ? `page=${page}` : "");

  if (results.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-xl leading-6 font-semibold tracking-[-0.18px]">
          {results.total === 0 ? "No homes yet" : "There is no such page"}
        </p>
        {results.total > 0 && (
          <Link href={HOME} className="font-medium underline">
            Back to the first page
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <ListingGrid listings={results.items} size="home" />
      <div className="mt-[74px]">
        <Pagination
          page={results.page}
          totalPages={results.total_pages}
          hrefFor={(target) => pageHref(HOME, target)}
          label="Homes pagination"
        />
      </div>
    </>
  );
}
