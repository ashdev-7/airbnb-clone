"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CompactSearch } from "@/components/search/compact-search";
import { FilterRow } from "@/components/search/filter-row";
import { SearchBar, type SearchField } from "@/components/search/search-bar";
import { useSearchState } from "@/hooks/use-search-state";
import { searchHref } from "@/lib/search-params";
import { BrandMark } from "./brand-mark";
import { HeaderTabs } from "./header-tabs";
import { UserNav } from "./user-nav";

/** Past this many pixels of scroll the header takes its compact form. Ours. */
const COMPACT_AFTER_PX = 40;

/**
 * The header of the travelling pages.
 *
 * Home, at the top (capture A1): a 96 px bar with the mark, the tabs and the account
 * controls, and under it the search bar; 200 px in all. Scrolled (capture A2): the bar
 * alone, with the search shrunk to a pill where the tabs were.
 * Search results (capture B1): always the compact form, with the filter row under it.
 * A listing (capture C1): the compact form, 80 px tall, and it scrolls away with the page;
 * the listing's own bar takes its place (components/listing/section-nav.tsx).
 * Clicking the pill opens the full search bar again, on the part that was clicked.
 *
 * The header is fixed and a spacer holds its resting height, so the page under it does
 * not jump when it changes.
 */
export function MainHeader() {
  const pathname = usePathname();
  const search = useSearchState();
  const onResults = pathname.startsWith("/s/");
  const onListing = pathname.startsWith("/rooms/");
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

  const compact = (onResults || onListing || scrolled) && reopened === null;
  const row = onListing && compact ? "h-20" : "h-header";
  const barHeight = compact ? row : "h-header-open";
  const spacer = onListing ? "h-[81px]" : onResults ? "h-[151px]" : "h-[201px]";

  return (
    <div className={spacer}>
      <header
        className={`inset-x-0 top-0 z-[100] border-b border-line-soft [background:var(--gradient-header)] ${
          onListing ? "absolute" : "fixed"
        }`}
      >
        <div className={`relative transition-[height] duration-200 ${barHeight}`}>
          <div className={`relative flex items-center justify-between px-gutter ${row}`}>
            <BrandMark />
            <div className={`absolute inset-x-0 top-0 flex justify-center ${row}`}>
              {compact ? (
                <div className="flex items-center">
                  <CompactSearch search={search} onOpen={(field) => setReopened({ field })} />
                </div>
              ) : (
                <div className="pt-[30px]">
                  <HeaderTabs />
                </div>
              )}
            </div>
            <div className="relative z-[1]">
              <UserNav />
            </div>
          </div>
          {!compact && (
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
        {onResults && <FilterRow />}
      </header>
    </div>
  );
}
