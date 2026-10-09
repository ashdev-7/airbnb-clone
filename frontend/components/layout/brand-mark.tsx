import { House } from "lucide-react";
import { SITE_NAME } from "@/lib/config";

/** The mark alone: the Lucide house (plan §5.2), in the colour of the original mark. */
export function BrandIcon({ size = 32 }: { size?: number }) {
  return <House size={size} strokeWidth={2.25} className="text-brand" aria-hidden />;
}

/**
 * The mark and wordmark. Capture A1: a 102 × 32 mark inside an 80 px tall link at the left
 * gutter; the wordmark is lowercase and rounded, like the original's.
 *
 * It is a plain link, not a router link, on purpose: clicking it always loads the home
 * page afresh, from every page including the home page itself, so nothing typed into a
 * search bar or left open on a page survives it.
 */
export function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load is the point (see above)
    <a
      href="/"
      aria-label={`${SITE_NAME} homepage`}
      className="relative z-[1] inline-flex h-20 w-[102px] items-center gap-[3px] text-brand"
    >
      <BrandIcon size={28} />
      <span className="font-wordmark text-[24px] leading-8 font-extrabold tracking-[-0.9px] lowercase">
        {SITE_NAME}
      </span>
    </a>
  );
}
