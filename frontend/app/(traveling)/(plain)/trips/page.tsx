import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Trips" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function TripsPage() {
  return <ComingSoon feature="Trips" note="Your reservations will be listed here once booking is available." />;
}
