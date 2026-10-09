import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Confirm and pay" };

/** A placeholder until this part is built (plan §6.11, §15). */
export default function ConfirmAndPayPage() {
  return <ComingSoon feature="Confirm and pay" note="Checkout is on its way. Nothing has been booked or charged." />;
}
