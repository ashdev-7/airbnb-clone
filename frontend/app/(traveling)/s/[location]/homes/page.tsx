import { Suspense } from "react";
import { SearchResults, SearchResultsSkeleton } from "@/components/search/search-results";

/** Search in a place: `/s/{location}/homes` (REF-H5). */
export default function SearchPlacePage({ params, searchParams }: PageProps<"/s/[location]/homes">) {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResults location={params.then((value) => value.location)} searchParams={searchParams} />
    </Suspense>
  );
}
