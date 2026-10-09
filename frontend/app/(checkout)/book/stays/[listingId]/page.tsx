import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/booking/checkout-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Confirm and pay" };

/** Checkout: `/book/stays/{listingId}` (capture D1), with the stay in the query. */
export default function CheckoutPage() {
  return (
    // The listing and the stay are in the URL, which is known only per request.
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[1120px] px-6 py-10">
          <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.96px]">Confirm and pay</h1>
          <Skeleton className="mt-6 h-64 rounded-control" />
        </main>
      }
    >
      <CheckoutView />
    </Suspense>
  );
}
