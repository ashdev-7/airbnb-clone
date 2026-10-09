import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Coming soon" };

/** Where the footer's links lead: `/coming-soon?about=Help Centre` names what was asked for. */
export default function ComingSoonPage({ searchParams }: PageProps<"/coming-soon">) {
  return (
    <Suspense fallback={<ComingSoon feature="Coming soon" />}>
      <About searchParams={searchParams} />
    </Suspense>
  );
}

async function About({ searchParams }: Pick<PageProps<"/coming-soon">, "searchParams">) {
  const about = (await searchParams).about;
  const text = (Array.isArray(about) ? about[0] : about)?.slice(0, 60).trim();
  return <ComingSoon feature={text || "Coming soon"} />;
}
