import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults, SearchResultsSkeleton } from "@/components/search/search-results";
import { shortPlace } from "@/lib/format";

/** The tab is named after the place: "Homes in Goa · AirStay". */
export async function generateMetadata({ params }: PageProps<"/s/[location]/homes">): Promise<Metadata> {
  const { location } = await params;
  let place = location;
  try {
    place = decodeURIComponent(location);
  } catch {
    // A malformed address: the raw text will do for a title.
  }
  return { title: `Homes in ${shortPlace(place).slice(0, 60)}` };
}

/** Search in a place: `/s/{location}/homes` (REF-H5). */
export default function SearchPlacePage({ params, searchParams }: PageProps<"/s/[location]/homes">) {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResults location={params.then((value) => value.location)} searchParams={searchParams} />
    </Suspense>
  );
}
