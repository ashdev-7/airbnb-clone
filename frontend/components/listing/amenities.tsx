"use client";

import { Check } from "lucide-react";
import { AmenityIcon, hasAmenityIcon } from "@/components/search/amenity-icon";
import { CATEGORY_NAMES } from "@/components/search/filter-sections";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useStay } from "@/hooks/use-stay";
import type { Amenity } from "@/types/api";

type Props = { listingId: number; amenities: Amenity[]; petsAllowed: boolean };

const SHOWN = 10;

function Row({ amenity }: { amenity: Amenity }) {
  return (
    <>
      <span className="flex w-6 shrink-0 justify-center">
        {hasAmenityIcon(amenity.slug) ? (
          <AmenityIcon slug={amenity.slug} size={24} />
        ) : (
          <Check size={22} strokeWidth={1.5} aria-hidden />
        )}
      </span>
      {amenity.name}
    </>
  );
}

/**
 * "What this place offers" (capture C9): the first ten amenities in two columns, 16 px
 * text beside 24 px icons, and a grey button that opens them all, grouped as the
 * original groups them (capture C7; group names REF-S1).
 */
export function Amenities({ listingId, amenities, petsAllowed }: Props) {
  const { stay, openModal, closeModal } = useStay(listingId);
  // Whether pets may come is a fact about the listing, shown with its amenities (C9).
  const all: Amenity[] = petsAllowed
    ? [...amenities, { slug: "pets-allowed", name: "Pets allowed", category: "other" }]
    : amenities;
  const categories = [...new Set(all.map((amenity) => amenity.category))];

  return (
    <section id="amenities" aria-labelledby="amenities-heading" className="scroll-mt-24 border-t border-line py-12">
      <h2 id="amenities-heading" className="pb-6 text-[22px] leading-[26px] font-medium tracking-[-0.44px]">
        What this place offers
      </h2>
      <ul className="grid gap-x-4 sm:grid-cols-2">
        {all.slice(0, SHOWN).map((amenity) => (
          <li key={amenity.slug} className="flex items-center gap-4 pb-4 text-base leading-5">
            <Row amenity={amenity} />
          </li>
        ))}
      </ul>
      {all.length > SHOWN && (
        <Button variant="soft" className="mt-4" onClick={() => openModal("amenities")}>
          Show all {all.length} amenities
        </Button>
      )}

      <Modal
        open={stay.modal === "amenities"}
        onOpenChange={(open) => !open && closeModal()}
        title="What this place offers"
        titleHidden
        size="xl"
      >
        <h2 className="pb-2 text-[26px] leading-[30px] font-medium">What this place offers</h2>
        {categories.map((category) => (
          <section key={category} className="pt-8">
            <h3 className="pb-2 text-lg leading-6 font-medium">{CATEGORY_NAMES[category] ?? "Other"}</h3>
            <ul>
              {all
                .filter((amenity) => amenity.category === category)
                .map((amenity) => (
                  <li key={amenity.slug} className="flex items-center gap-4 border-b border-line py-6 text-base leading-5">
                    <Row amenity={amenity} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </Modal>
    </section>
  );
}
