import type { Metadata } from "next";
import { HostingView } from "@/components/hosting/hosting-view";

export const metadata: Metadata = { title: "Hosting" };

export default function HostingPage() {
  return <HostingView />;
}
