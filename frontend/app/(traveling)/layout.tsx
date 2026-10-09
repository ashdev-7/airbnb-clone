import { Suspense } from "react";
import { Footer } from "@/components/layout/footer";
import { MainHeader } from "@/components/layout/main-header";

/** The travelling pages: main header above, footer below (plan §7.4). */
export default function TravelingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* The header reads the search from the URL, which is known only per request. */}
      <Suspense fallback={<div className="h-[201px] border-b border-line-soft" />}>
        <MainHeader />
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
