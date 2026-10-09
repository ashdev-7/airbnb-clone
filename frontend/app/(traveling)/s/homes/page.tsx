import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults, SearchResultsSkeleton } from "@/components/search/search-results";

export const metadata: Metadata = { title: "Homes" };

/** Search everywhere: `/s/homes` (REF-H5). */
export default function SearchEverywherePage({ searchParams }: PageProps<"/s/homes">) {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
