import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Experiences" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function ExperiencesPage() {
  return <ComingSoon feature="Experiences" note="Activities hosted by locals are not part of this version." />;
}
