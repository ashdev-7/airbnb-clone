import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Calendar" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function HostingCalendarPage() {
  return <ComingSoon feature="Calendar" note="The hosting calendar is not part of this version." />;
}
