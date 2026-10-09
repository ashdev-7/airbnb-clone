import { Suspense } from "react";
import { ListingRow } from "@/components/listings/listing-row";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListings } from "@/lib/api/listings";
import { formatHomes } from "@/lib/format";
import { searchPath } from "@/lib/search-params";

/**
 * The rows of the home page: a heading and the place it searches. Headings follow the
 * forms of capture A1 ("Popular homes in …", "Stay in …"); the places are our own.
 */
const ROWS = [
  { title: "Popular homes in Goa", location: "Goa" },
  { title: "Stay in Manali", location: "Manali" },
  { title: "Homes in Jaipur", location: "Jaipur" },
  { title: "Stay in Kerala", location: "Kerala" },
  { title: "Homes in Karnataka", location: "Karnataka" },
];

/** Two screenfuls of seven: enough for the row's arrows to have somewhere to go. */
const ROW_SIZE = 14;

/**
 * Home (plan §6.3; capture A1): rows of homes by destination, inside the 88 px margins of
 * the capture. Each heading opens the search results for its place, where the filters,
 * the full grid, the map and the pagination are.
 */
export default function HomePage() {
  return (
    <main className="px-[88px] pb-16 max-lg:px-gutter">
      <h1 className="sr-only">Explore homes</h1>
      <Suspense fallback={<RowsSkeleton />}>
        <Rows />
      </Suspense>
    </main>
  );
}

async function Rows() {
  const rows = await Promise.all(
    ROWS.map(async (row) => ({
      ...row,
      results: await fetchListings(`location=${encodeURIComponent(row.location)}&page_size=${ROW_SIZE}`),
    })),
  );

  return rows
    .filter(({ results }) => results.items.length > 0)
    .map(({ title, location, results }, index) => (
      <ListingRow
        key={location}
        title={title}
        subtitle={formatHomes(results.total)}
        href={searchPath(location)}
        listings={results.items}
        eager={index === 0}
      />
    ));
}

/** The loading state: rows of the same shape, without content (plan §6.13). */
function RowsSkeleton() {
  return (
    <div role="status" aria-label="Loading homes">
      {Array.from({ length: 3 }, (_, row) => (
        <div key={row} className="pt-10">
          <Skeleton className="h-6 w-64" />
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }, (_, card) => (
              <div key={card}>
                <Skeleton className="aspect-[20/19] !rounded-card" />
                <Skeleton className="mx-1 mt-2 h-4 w-3/4" />
                <Skeleton className="mx-1 mt-1 h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
