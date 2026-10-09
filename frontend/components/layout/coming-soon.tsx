import Link from "next/link";

type Props = {
  /** What the visitor was looking for: "Messages", "Trips", "Help Centre". */
  feature: string;
  /** One sentence about it, when there is something to say. */
  note?: string;
};

/**
 * The page behind every link that leads to something this project does not have, or does
 * not have yet (plan §6.11). No link ends on the not-found page.
 */
export function ComingSoon({ feature, note }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-gutter py-24 text-center">
      <p className="rounded-full bg-control px-3 py-1 text-xs leading-4 font-medium text-muted">Coming soon</p>
      <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.96px]">{feature}</h1>
      <p className="max-w-[440px] text-base leading-6 text-muted">
        {note ?? "This part of the site is not available yet."}
      </p>
      <Link href="/" className="mt-3 rounded-control bg-ink px-6 py-3 text-base font-medium text-white">
        Explore homes
      </Link>
    </main>
  );
}
