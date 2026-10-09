import { House } from "lucide-react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

/** The mark alone: the Lucide house (plan §5.2), in the colour of the original mark. */
export function BrandIcon({ size = 32 }: { size?: number }) {
  return <House size={size} strokeWidth={2.25} className="text-brand" aria-hidden />;
}

/**
 * The mark and wordmark, a link home. Capture A1: 102 × 32, inside an 80 px tall link at
 * the left gutter.
 */
export function BrandMark({ href = "/", label }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label ?? `${SITE_NAME} homepage`}
      className="relative z-[1] inline-flex h-20 items-center gap-1 text-brand"
    >
      <BrandIcon size={30} />
      <span className="text-[22px] leading-8 font-bold tracking-[-0.6px]">{SITE_NAME}</span>
    </Link>
  );
}
