import type { Metadata } from "next";
import { BecomeHostView } from "@/components/hosting/become-host-view";

export const metadata: Metadata = { title: "Become a host" };

export default function BecomeAHostPage() {
  return <BecomeHostView />;
}
