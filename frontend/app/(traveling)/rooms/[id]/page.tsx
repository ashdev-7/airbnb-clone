import { Suspense } from "react";
import { ListingSkeleton, ListingView } from "@/components/listing/listing-view";

/** A listing: `/rooms/{id}` (REF-H5). The dates and guests of the stay are in the query. */
export default function ListingPage({ params }: PageProps<"/rooms/[id]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingView id={params.then((value) => value.id)} />
    </Suspense>
  );
}
