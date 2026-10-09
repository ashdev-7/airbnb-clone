import { Suspense } from "react";
import { ResultsHeader, ResultsHeaderFallback } from "@/components/layout/main-header";

/** Search results: the header shows the search of the URL, and the filter row (capture B1). */
export default function SearchLayout({ children }: LayoutProps<"/s">) {
  return (
    <>
      {/* The search is in the URL, which is known only per request. */}
      <Suspense fallback={<ResultsHeaderFallback />}>
        <ResultsHeader />
      </Suspense>
      {children}
    </>
  );
}
