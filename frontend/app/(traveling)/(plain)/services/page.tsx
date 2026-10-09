import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Services" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function ServicesPage() {
  return <ComingSoon feature="Services" note="Services for your stay are not part of this version." />;
}
