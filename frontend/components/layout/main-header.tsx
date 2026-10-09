"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "./brand-mark";
import { HeaderTabs } from "./header-tabs";
import { CompactSearch, SearchBar } from "./search-bar";
import { UserNav } from "./user-nav";

/** Past this many pixels of scroll the header takes its compact form. Ours. */
const COMPACT_AFTER_PX = 40;

/**
 * The header of the travelling pages.
 *
 * Open (capture A1): a 96 px bar with the mark, the tabs and the account controls, and
 * under it the search bar; 200 px in all, over a faint gradient with a hairline below.
 * Scrolled (capture A2): the bar alone, with the search shrunk to a pill where the tabs
 * were. The header is fixed and a spacer holds its open height, so the page under it
 * does not jump when it changes.
 */
export function MainHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > COMPACT_AFTER_PX);
      setReopened(false); // scrolling on puts the bar away again
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const compact = scrolled && !reopened;

  return (
    <div className="h-[calc(var(--spacing-header-open)+1px)]">
      <header
        className={`fixed inset-x-0 top-0 z-[100] overflow-hidden border-b border-line-soft transition-[height] duration-200 [background:var(--gradient-header)] ${
          compact ? "h-[calc(var(--spacing-header)+1px)]" : "h-[calc(var(--spacing-header-open)+1px)]"
        }`}
      >
        <div className="relative flex h-header items-center justify-between px-gutter">
          <BrandMark />
          <div className="absolute inset-x-0 top-0 flex h-header justify-center">
            {compact ? (
              <div className="flex items-center">
                <CompactSearch onOpen={() => setReopened(true)} />
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
        <div
          aria-hidden={compact}
          inert={compact}
          className={`flex justify-center px-gutter pt-[6px] transition-opacity duration-200 ${
            compact ? "opacity-0" : "opacity-100"
          }`}
        >
          <SearchBar />
        </div>
      </header>
    </div>
  );
}
