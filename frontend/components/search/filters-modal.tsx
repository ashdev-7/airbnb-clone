"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeta } from "@/hooks/use-meta";
import { getSummary } from "@/lib/api/catalogue";
import { formatHomes } from "@/lib/format";
import { priceBounds } from "@/lib/price-range";
import {
  NO_FILTERS,
  activeFilterCount,
  apiQuery,
  filtersOf,
  searchHref,
  type Filters,
  type SearchState,
} from "@/lib/search-params";
import { AmenitiesSection, FilterSection, PropertyTypeSection, RoomsSection } from "./filter-sections";
import { PriceRange } from "./price-range";

type Props = { search: SearchState; onClose: () => void };

/**
 * The filters modal (captures B5 to B7), with the sections we have data for, in the
 * original's order (REF-S1): price range, rooms and beds, amenities, property type.
 * Changes are a draft until "Show N homes" is pressed; the button counts the homes the
 * draft would find. Applying writes the filters to the URL and returns to page 1.
 *
 * It is mounted only while open, so each opening starts from the filters in the URL.
 */
export function FiltersModal({ search, onClose }: Props) {
  const router = useRouter();
  const { meta } = useMeta();
  const [filters, setFilters] = useState<Filters>(() => filtersOf(search));
  const draft: SearchState = { ...search, ...filters, page: 1 };

  const count = useQuery({
    queryKey: ["summary", apiQuery(draft, false)],
    queryFn: () => getSummary(apiQuery(draft, false)),
    placeholderData: (previous) => previous,
  });
  // The histogram and the ends of the slider describe the search without its price
  // filter, so they do not move while the handles are dragged.
  const unpriced = apiQuery({ ...draft, priceMin: null, priceMax: null }, false);
  const prices = useQuery({
    queryKey: ["summary", unpriced],
    queryFn: () => getSummary(unpriced),
    placeholderData: (previous) => previous,
  });
  const bounds = priceBounds(prices.data);

  function apply() {
    router.push(searchHref(draft));
    onClose();
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Filters"
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            className="!rounded-control"
            disabled={activeFilterCount(filters) === 0}
            onClick={() => setFilters(NO_FILTERS)}
          >
            Clear all
          </Button>
          <Button variant="dark" className="!text-sm" onClick={apply}>
            {count.data ? `Show ${formatHomes(count.data.total)}` : "Show homes"}
          </Button>
        </>
      }
    >
      <FilterSection title="Price range" note="Nightly price, before fees">
        {bounds && prices.data ? (
          <PriceRange
            bounds={bounds}
            histogram={prices.data.histogram}
            value={{ priceMin: filters.priceMin, priceMax: filters.priceMax }}
            onChange={(price) => setFilters({ ...filters, ...price })}
          />
        ) : prices.isPending ? (
          <Skeleton className="h-40 rounded-control" />
        ) : (
          <p className="text-muted">No homes to show prices for.</p>
        )}
      </FilterSection>
      <RoomsSection filters={filters} onChange={setFilters} />
      {meta ? (
        <>
          <AmenitiesSection filters={filters} onChange={setFilters} meta={meta} />
          <PropertyTypeSection filters={filters} onChange={setFilters} meta={meta} />
        </>
      ) : (
        <Skeleton className="my-7 h-40 rounded-control" />
      )}
    </Modal>
  );
}
