import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";

export const metadata: Metadata = { title: "Page not found" };

/** Any address that is not a page of this site. */
export default function NotFound() {
  return (
    <>
      <header className="flex h-header-checkout items-center px-gutter">
        <BrandMark />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-gutter pb-24 text-center">
        <h1 className="text-[26px] leading-[30px] font-semibold tracking-[-0.52px]">
          We can’t find that page
        </h1>
        <p className="text-muted">The address may be wrong, or the page may have moved.</p>
        <Link href="/" className="mt-2 font-medium underline">
          Back to the home page
        </Link>
      </main>
    </>
  );
}
