import { Suspense } from "react";
import { SearchResults, SearchResultsSkeleton } from "@/components/search/search-results";

/** Search everywhere: `/s/homes` (REF-H5). */
export default function SearchEverywherePage({ searchParams }: PageProps<"/s/homes">) {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
