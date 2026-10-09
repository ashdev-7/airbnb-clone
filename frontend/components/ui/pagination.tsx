import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { pageItems } from "@/lib/pagination";

type Props = {
  page: number;
  totalPages: number;
  /** The address of a page; the caller owns the URL (lib/search-params.ts). */
  hrefFor: (page: number) => string;
  label: string;
};

const CELL = "flex size-8 items-center justify-center rounded-full text-sm font-medium";

function Arrow({ href, label, back }: { href: string | null; label: string; back?: boolean }) {
  const Icon = back ? ChevronLeft : ChevronRight;
  const icon = <Icon size={16} strokeWidth={2.5} aria-hidden />;
  if (!href) {
    return (
      <span aria-label={label} aria-disabled className={`${CELL} text-faint opacity-50`}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={`${CELL} hover:bg-control`}>
      {icon}
    </Link>
  );
}

/** Numbered pages, as in capture B2: 32 px discs, 16 px apart, the current one filled. */
export function Pagination({ page, totalPages, hrefFor, label }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-4">
      <Arrow back label="Previous" href={page > 1 ? hrefFor(page - 1) : null} />
      {pageItems(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden className={`${CELL} pb-2`}>
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            aria-label={`Page ${item} of ${totalPages}`}
            className={`${CELL} bg-ink text-white`}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-label={`Page ${item} of ${totalPages}`}
            className={`${CELL} hover:bg-control`}
          >
            {item}
          </Link>
        ),
      )}
      <Arrow label="Next" href={page < totalPages ? hrefFor(page + 1) : null} />
    </nav>
  );
}
