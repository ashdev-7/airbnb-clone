import type { Metadata } from "next";
import { HostingView } from "@/components/hosting/hosting-view";

export const metadata: Metadata = { title: "Listings" };

export default function HostingListingsPage() {
  return <HostingView initialTab="listings" title="Listings" />;
}
