"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { useBooking, type BookableListing } from "./use-booking";

type Props = { listing: BookableListing & { price_per_night_minor: number } };

const LINKS = [
  { label: "Photos", href: "#photos" },
  { label: "Amenities", href: "#amenities" },
  { label: "Reviews", href: "#reviews" },
  { label: "Location", href: "#location" },
];

/**
 * The bar that takes the header's place once the photos have scrolled away (capture C9):
 * 80 px tall, links to the sections of the page at the left; once the booking card has
 * scrolled away too, the price and "Reserve" at the right (capture C8).
 */
export function SectionNav({ listing }: Props) {
  const { reserve } = useBooking(listing);
  const [pastPhotos, setPastPhotos] = useState(false);
  const [pastCard, setPastCard] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const photos = document.getElementById("photos");
      const card = document.getElementById("booking");
      setPastPhotos(photos ? photos.getBoundingClientRect().bottom < 0 : false);
      setPastCard(card ? card.getBoundingClientRect().bottom < 80 : false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!pastPhotos) return null;

  return (
    <nav
      aria-label="Sections of this page"
      className="fixed inset-x-0 top-0 z-[90] border-b border-line bg-white"
    >
      <div className="mx-auto flex h-20 w-[1120px] max-w-[calc(100vw-96px)] items-center justify-between">
        <ul className="flex gap-6">
          {LINKS.map(({ label, href }) => (
            <li key={href}>
              <a href={href} className="flex h-20 items-center border-b-4 border-transparent text-sm font-medium hover:border-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
        {pastCard && (
          <div className="flex items-center gap-4">
            <p className="text-sm leading-[18px]">
              <span className="text-base font-semibold">{formatMoney(listing.price_per_night_minor)}</span> per night
            </p>
            <button
              type="button"
              onClick={() =>
                reserve(() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "center" }))
              }
              className="flex h-12 items-center rounded-full px-6 text-base font-medium text-white [background:var(--gradient-primary)]"
            >
              Reserve
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
