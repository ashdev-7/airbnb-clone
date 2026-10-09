import Link from "next/link";
import { Suspense } from "react";
import { ListingGrid, ListingGridSkeleton } from "@/components/listings/listing-grid";
import { Pagination } from "@/components/ui/pagination";
import { fetchListings } from "@/lib/api/listings";
import { pageHref, parsePage } from "@/lib/search-params";

const HOME = "/";

/**
 * Home: the explore view (plan §6.3, D10). The page number lives in the URL and the grid
 * is rendered on the server; the skeleton shows while the listings are on their way.
 */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main className="px-gutter pt-8 pb-12">
      <h1 className="sr-only">Explore homes</h1>
      <Suspense fallback={<ListingGridSkeleton />}>
        <Explore searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Explore({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const page = parsePage((await searchParams).page);
  const results = await fetchListings(page);

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
      <ListingGrid listings={results.items} />
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
