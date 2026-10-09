import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Listings" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function HostingListingsPage() {
  return <ComingSoon feature="Listings" note="Your listings, with ways to edit and remove them, are on their way." />;
}
