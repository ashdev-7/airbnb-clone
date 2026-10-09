import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingSkeleton, ListingView } from "@/components/listing/listing-view";
import { fetchListing } from "@/lib/api/listings";
import { listingHeadline } from "@/lib/format";

/** The tab is named after the listing: "Quiet flat with a reading nook - Flat in Goa · AirStay". */
export async function generateMetadata({ params }: PageProps<"/rooms/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return { title: "Page not found" };
  try {
    const listing = await fetchListing(Number(id));
    return { title: `${listing.title} - ${listingHeadline(listing.property_type.name, listing.city)}` };
  } catch {
    return { title: "Page not found" };
  }
}

/** A listing: `/rooms/{id}` (REF-H5). The dates and guests of the stay are in the query. */
export default function ListingPage({ params }: PageProps<"/rooms/[id]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingView id={params.then((value) => value.id)} />
    </Suspense>
  );
}
