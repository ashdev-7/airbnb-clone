import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Profile" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function ProfilePage() {
  return <ComingSoon feature="Profile" note="Your profile page is on its way." />;
}
