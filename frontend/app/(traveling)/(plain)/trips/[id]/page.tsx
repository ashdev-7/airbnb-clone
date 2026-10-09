import type { Metadata } from "next";
import { Suspense } from "react";
import { ReservationView } from "@/components/trips/reservation-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Reservation details" };

/** One reservation: `/trips/{bookingId}`, also the confirmation page after paying. */
export default function ReservationPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-10">
      <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.96px]">Reservation details</h1>
      {/* The booking id is in the URL, which is known only per request. */}
      <Suspense fallback={<Skeleton className="mt-8 h-64 !rounded-xl" />}>
        <ReservationView />
      </Suspense>
    </main>
  );
}
