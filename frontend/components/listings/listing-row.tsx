"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ListingCard as Listing } from "@/types/api";
import { ListingCard } from "./listing-card";

type Props = {
  title: string;
  subtitle: string;
  /** Where the heading leads: the search for this place. */
  href: string;
  listings: Listing[];
  /** The first row is on screen at once, so its photos are loaded eagerly. */
  eager?: boolean;
};

const ARROW =
  "flex size-7 items-center justify-center rounded-full bg-control disabled:text-faint disabled:opacity-50";

/**
 * A row of homes on the home page (captures A1, A2): a 20 px heading that links to the
 * search for the place, a grey line under it, and seven cards across, 12 px apart, with
 * two 28 px arrows at the right that move the row by one screenful.
 */
export function ListingRow({ title, subtitle, href, listings, eager = false }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(listings.length <= 7);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      setAtStart(element.scrollLeft <= 2);
      setAtEnd(element.scrollLeft + element.clientWidth >= element.scrollWidth - 2);
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [listings.length]);

  const move = (direction: 1 | -1) => {
    const element = track.current;
    // One screenful and one gap, so the next seven cards line up where these were.
    element?.scrollBy({ left: direction * (element.clientWidth + 12), behavior: "smooth" });
  };

  return (
    <section aria-label={title} className="pt-10">
      <div className="flex items-start justify-between">
        <Link href={href} className="group block rounded-lg">
          <h2 className="flex items-center gap-1.5 text-xl leading-6 font-semibold tracking-[-0.18px]">
            {title}
            <span className="flex size-7 items-center justify-center rounded-full bg-control group-hover:bg-line-soft">
              <ArrowRight size={12} strokeWidth={3} aria-hidden />
            </span>
          </h2>
          <p className="pt-0.5 text-sm leading-[18px] text-muted">{subtitle}</p>
        </Link>
        <div className="flex gap-1">
          <button type="button" aria-label={`Previous homes in ${title}`} disabled={atStart} onClick={() => move(-1)} className={ARROW}>
            <ChevronLeft size={12} strokeWidth={3} aria-hidden />
          </button>
          <button type="button" aria-label={`Next homes in ${title}`} disabled={atEnd} onClick={() => move(1)} className={ARROW}>
            <ChevronRight size={12} strokeWidth={3} aria-hidden />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        className="-mx-1 mt-3 grid snap-x snap-mandatory auto-cols-[calc((100%-72px)/7)] grid-flow-col gap-3 overflow-x-auto scroll-smooth scroll-px-1 px-1 pt-1 pb-2 [scrollbar-width:none] max-[1100px]:auto-cols-[calc((100%-36px)/4)] max-[700px]:auto-cols-[calc((100%-12px)/2)]"
      >
        {listings.map((listing, index) => (
          <li key={listing.id} className="snap-start">
            <ListingCard listing={listing} size="home" eager={eager && index < 7} />
          </li>
        ))}
      </ul>
    </section>
  );
}
