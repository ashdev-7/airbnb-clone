"use client";

import { useEffect, useState } from "react";
import { CompactSearch } from "@/components/search/compact-search";
import { FilterRow } from "@/components/search/filter-row";
import { SearchBar, type SearchField } from "@/components/search/search-bar";
import { useSearchState } from "@/hooks/use-search-state";
import { EMPTY_SEARCH, searchHref, type SearchState } from "@/lib/search-params";
import { BrandMark } from "./brand-mark";
import { HeaderTabs } from "./header-tabs";
import { UserNav } from "./user-nav";

/**
 * Which header a page has. Each group of pages names its own in its layout, so the server
 * sends the right one in the first HTML, at its final height.
 *
 * - "home" (capture A1): a 96 px bar with the mark, the tabs and the account controls, and
 *   the search bar under it, 200 px in all. Once scrolled (A2), the bar alone, with the
 *   search shrunk to a pill where the tabs were.
 * - "results" (B1): the bar with the pill, showing the search, and the filter row under it.
 * - "listing" (C1): an 80 px bar with the pill; it scrolls away with the page.
 * - "plain" (E1, E2): the 96 px bar with the mark and the account controls only.
 */
export type HeaderVariant = "home" | "results" | "listing" | "plain";

/** Past this many pixels of scroll the home header takes its compact form. Ours. */
const COMPACT_AFTER_PX = 40;

const SPACER: Record<HeaderVariant, string> = {
  home: "h-[201px]",
  results: "h-[151px]",
  listing: "h-[81px]",
  plain: "h-[97px]",
};

type Props = { variant: HeaderVariant; search?: SearchState };

/**
 * The header of the travelling pages. It is fixed (except on a listing) and a spacer
 * holds its resting height, so the page under it does not jump when it changes.
 * Clicking the pill opens the full search bar again, on the part that was clicked.
 */
export function MainHeader({ variant, search = EMPTY_SEARCH }: Props) {
  const [scrolled, setScrolled] = useState(false);
  /** Set while the full bar is open over the compact form; `field` is the panel to show. */
  const [reopened, setReopened] = useState<{ field: SearchField } | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > COMPACT_AFTER_PX);
      setReopened(null); // scrolling on puts the bar away again
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasSearch = variant !== "plain";
  const compact = (variant !== "home" || scrolled) && reopened === null;
  const row = variant === "listing" && compact ? "h-20" : "h-header";
  const barHeight = compact || !hasSearch ? row : "h-header-open";

  return (
    <div className={SPACER[variant]}>
      <header
        className={`inset-x-0 top-0 z-[100] border-b border-line-soft [background:var(--gradient-header)] ${
          variant === "listing" ? "absolute" : "fixed"
        }`}
      >
        <div className={`relative transition-[height] duration-200 ${barHeight}`}>
          <div className={`relative flex items-center justify-between px-gutter ${row}`}>
            <BrandMark />
            {hasSearch && (
              <div className={`absolute inset-x-0 top-0 flex justify-center ${row}`}>
                {compact ? (
                  <div className="flex items-center">
                    <CompactSearch search={search} onOpen={(field) => setReopened({ field })} />
                  </div>
                ) : (
                  <div className="pt-[30px]">{variant === "home" && <HeaderTabs />}</div>
                )}
              </div>
            )}
            <div className="relative z-[1]">
              <UserNav />
            </div>
          </div>
          {hasSearch && !compact && (
            <div className="absolute inset-x-0 top-[102px] flex justify-center px-gutter">
              {/* The key starts the bar afresh whenever the search in the URL changes. */}
              <SearchBar
                key={`${searchHref(search)}|${reopened?.field ?? ""}`}
                initial={search}
                openField={reopened?.field ?? null}
                onDismiss={() => setReopened(null)}
              />
            </div>
          )}
        </div>
        {variant === "results" && <FilterRow />}
      </header>
    </div>
  );
}

/** The results header: the only one that shows a search, which it reads from the URL. */
export function ResultsHeader() {
  return <MainHeader variant="results" search={useSearchState()} />;
}

/** What stands in for the results header until the URL is known (a moment, per request). */
export function ResultsHeaderFallback() {
  return (
    <div className={SPACER.results}>
      <header className="fixed inset-x-0 top-0 z-[100] h-[151px] border-b border-line-soft px-gutter [background:var(--gradient-header)]">
        <BrandMark />
      </header>
    </div>
  );
}
