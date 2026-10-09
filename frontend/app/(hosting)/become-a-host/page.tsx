import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Become a host" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function BecomeAHostPage() {
  return <ComingSoon feature="Become a host" note="Listing your own place is on its way." />;
}
