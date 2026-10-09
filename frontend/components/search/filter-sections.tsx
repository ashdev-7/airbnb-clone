"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { Stepper } from "@/components/ui/stepper";
import { toggled, type Filters } from "@/lib/search-params";
import type { Amenity, Meta } from "@/types/api";
import { AmenityIcon } from "./amenity-icon";

type SectionProps = { filters: Filters; onChange: (filters: Filters) => void };

/** A section of the filters modal: an 18 px medium heading, with a rule above (capture B5). */
export function FilterSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border-t border-line-soft py-7 first:border-t-0 first:pt-2">
      <h3 className="text-lg leading-6 font-medium">{title}</h3>
      {note && <p className="pt-2 text-sm leading-[18px]">{note}</p>}
      <div className="pt-4">{children}</div>
    </section>
  );
}

const ROOMS = [
  { key: "minBedrooms", label: "Bedrooms" },
  { key: "minBeds", label: "Beds" },
  { key: "minBathrooms", label: "Bathrooms" },
] as const;
const MAX_ROOMS = 8;

/** "Rooms and beds" (capture B5): three rows 56 px apart; zero reads "Any". */
export function RoomsSection({ filters, onChange }: SectionProps) {
  return (
    <FilterSection title="Rooms and beds">
      <ul className="grid gap-6">
        {ROOMS.map(({ key, label }) => (
          <li key={key} className="flex items-center justify-between">
            <span className="text-base leading-5">{label}</span>
            <Stepper
              label={label}
              value={filters[key]}
              min={0}
              max={MAX_ROOMS}
              format={(value) => (value === 0 ? "Any" : `${value}+`)}
              onChange={(value) => onChange({ ...filters, [key]: value })}
            />
          </li>
        ))}
      </ul>
    </FilterSection>
  );
}

/** Group names: REF-S1, in the India site's spelling. */
const CATEGORY_NAMES: Record<string, string> = {
  bathroom: "Bathroom",
  bedroom_laundry: "Bedroom and laundry",
  entertainment: "Entertainment",
  family: "Family",
  heating_cooling: "Heating and cooling",
  home_safety: "Home safety",
  internet_office: "Internet and office",
  kitchen_dining: "Kitchen and dining",
  location: "Location features",
  outdoor: "Outdoor",
  parking_facilities: "Parking and facilities",
};

/** The amenities shown before "Show more": the first row of capture B6 that we have. */
const POPULAR = ["air-conditioning", "wifi", "pool", "tv", "kitchen", "free-parking"];

function AmenityChips({ amenities, filters, onChange }: SectionProps & { amenities: Amenity[] }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-3">
      {amenities.map((amenity) => (
        <Chip
          key={amenity.slug}
          size="lg"
          selected={filters.amenities.includes(amenity.slug)}
          onToggle={() => onChange({ ...filters, amenities: toggled(filters.amenities, amenity.slug) })}
          icon={<AmenityIcon slug={amenity.slug} />}
        >
          {amenity.name}
        </Chip>
      ))}
    </div>
  );
}

/** "Amenities" (capture B6): 48 px chips; "Show more" opens every group (REF-S1). */
export function AmenitiesSection({ filters, onChange, meta }: SectionProps & { meta: Meta }) {
  const hiddenChosen = filters.amenities.some((slug) => !POPULAR.includes(slug));
  const [expanded, setExpanded] = useState(hiddenChosen);
  const popular = POPULAR.flatMap((slug) => meta.amenities.find((amenity) => amenity.slug === slug) ?? []);

  return (
    <FilterSection title="Amenities">
      {!expanded ? (
        <AmenityChips amenities={popular} filters={filters} onChange={onChange} />
      ) : (
        <div className="grid gap-6">
          {meta.amenity_categories.map((category) => (
            <div key={category}>
              <h4 className="pb-3 text-sm leading-[18px] font-medium">
                {CATEGORY_NAMES[category] ?? category}
              </h4>
              <AmenityChips
                amenities={meta.amenities.filter((amenity) => amenity.category === category)}
                filters={filters}
                onChange={onChange}
              />
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="mt-6 inline-flex items-center gap-1.5 rounded text-base leading-5 font-medium underline"
      >
        {expanded ? "Show less" : "Show more"}
        <ChevronDown size={16} className={expanded ? "rotate-180" : ""} aria-hidden />
      </button>
    </FilterSection>
  );
}

/** "Property type" (capture B7): a heading that opens to show the types. */
export function PropertyTypeSection({ filters, onChange, meta }: SectionProps & { meta: Meta }) {
  const [open, setOpen] = useState(filters.propertyTypes.length > 0);

  return (
    <section className="border-t border-line-soft py-7">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-lg leading-6 font-medium">Property type</h3>
        <ChevronDown size={20} className={open ? "rotate-180" : ""} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-wrap gap-x-2 gap-y-3 pt-6">
          {meta.property_types.map((type) => (
            <Chip
              key={type.slug}
              size="lg"
              selected={filters.propertyTypes.includes(type.slug)}
              onToggle={() =>
                onChange({ ...filters, propertyTypes: toggled(filters.propertyTypes, type.slug) })
              }
            >
              {type.name}
            </Chip>
          ))}
        </div>
      )}
    </section>
  );
}
