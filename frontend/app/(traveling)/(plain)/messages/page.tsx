import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Messages" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function MessagesPage() {
  return <ComingSoon feature="Messages" note="Messaging between guests and hosts is not part of this version." />;
}
