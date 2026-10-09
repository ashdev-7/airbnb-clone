import { HostingHeader } from "@/components/layout/hosting-header";

/** The hosting pages: the hosting header above them (plan §7.4). */
export default function HostingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <HostingHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
