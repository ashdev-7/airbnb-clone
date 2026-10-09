import type { Metadata } from "next";
import { TripsView } from "@/components/trips/trips-view";

export const metadata: Metadata = { title: "Trips" };

/** Trips (plan §6.8): the signed-in user's reservations. */
export default function TripsPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-10">
      <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.96px]">Trips</h1>
      <TripsView />
    </main>
  );
}
