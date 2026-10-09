import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Hosting" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function HostingPage() {
  return <ComingSoon feature="Hosting" note="The hosting dashboard, with your reservations and listings, is on its way." />;
}
