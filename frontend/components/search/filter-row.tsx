"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeta } from "@/hooks/use-meta";
import { useSearchState } from "@/hooks/use-search-state";
import { formatRupees } from "@/lib/format";
import { activeFilterCount, filtersOf, searchHref, toggled, type SearchState } from "@/lib/search-params";
import { FiltersModal } from "./filters-modal";

/**
 * Quick filters (assignment O3): a price cap, property types, amenities, and whether pets
 * may come. Wifi is not offered: every seeded home has it, so it would filter nothing.
 */
const QUICK_PRICE_MAX = 5000;
const QUICK_TYPES = ["villa", "apartment", "cabin"];
const QUICK_AMENITIES = ["kitchen", "free-parking", "air-conditioning", "pool"];

/**
 * The filter row of capture B1: a "Filters" button, a rule, then on/off chips, all 34 px
 * tall and 8 px apart. The row holds no state of its own: every chip reads the URL and
 * writes a new one, on the search page, starting again from page 1.
 */
export function FilterRow() {
  const router = useRouter();
  const search = useSearchState();
  const { meta } = useMeta();
  const [modalOpen, setModalOpen] = useState(false);
  const active = activeFilterCount(filtersOf(search));

  const go = (change: Partial<SearchState>) => router.push(searchHref({ ...search, ...change, page: 1 }));
  const quickPrice = search.priceMin === null && search.priceMax === QUICK_PRICE_MAX;

  return (
    <div role="group" aria-label="Filters" className="flex h-[54px] items-center justify-center px-gutter">
      <div className="flex items-center gap-2 overflow-x-auto py-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`inline-flex h-[34px] shrink-0 items-center gap-2 rounded-3xl border bg-white px-3 text-xs leading-4 hover:border-ink ${
            active > 0 ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line"
          }`}
        >
          <SlidersHorizontal size={16} aria-hidden />
          Filters
          {active > 0 && (
            <span
              aria-label={`${active} active`}
              className="flex size-[18px] items-center justify-center rounded-full bg-ink text-[10px] font-medium text-white"
            >
              {active}
            </span>
          )}
        </button>
        <span aria-hidden className="mx-2 h-6 w-px shrink-0 bg-line" />

        <Chip
          selected={quickPrice}
          onToggle={() => go({ priceMin: null, priceMax: quickPrice ? null : QUICK_PRICE_MAX })}
        >
          Under {formatRupees(QUICK_PRICE_MAX)}
        </Chip>
        {!meta && <Skeleton className="h-[34px] w-[520px] rounded-3xl" />}
        {meta?.property_types
          .filter((type) => QUICK_TYPES.includes(type.slug))
          .map((type) => (
            <Chip
              key={type.slug}
              selected={search.propertyTypes.includes(type.slug)}
              onToggle={() => go({ propertyTypes: toggled(search.propertyTypes, type.slug) })}
            >
              {type.name}
            </Chip>
          ))}
        {QUICK_AMENITIES.flatMap((slug) => meta?.amenities.find((amenity) => amenity.slug === slug) ?? []).map(
          (amenity) => (
            <Chip
              key={amenity.slug}
              selected={search.amenities.includes(amenity.slug)}
              onToggle={() => go({ amenities: toggled(search.amenities, amenity.slug) })}
            >
              {amenity.name}
            </Chip>
          ),
        )}
        <Chip selected={search.petsAllowed} onToggle={() => go({ petsAllowed: !search.petsAllowed })}>
          Pets allowed
        </Chip>
      </div>
      {modalOpen && <FiltersModal search={search} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
