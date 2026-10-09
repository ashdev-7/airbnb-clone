"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeta } from "@/hooks/use-meta";
import { useToast } from "@/hooks/use-toast";
import { createListing, fieldMessages, getListing, toFormValues, updateListing } from "@/lib/api/hosting";
import type { ListingFormValues } from "@/types/hosting";

const INPUT = "h-12 w-full rounded-control border border-line px-3";
const LABEL = "grid gap-1 text-sm font-medium";

const EMPTY: ListingFormValues = {
  title: "",
  description: "",
  property_type: "",
  city: "",
  state: "",
  country: "India",
  max_guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  price_rupees: 3000,
  cleaning_fee_rupees: 0,
  pets_allowed: false,
  amenities: [],
  photos: "",
};

const NUMBERS = [
  ["max_guests", "Guests", 1],
  ["bedrooms", "Bedrooms", 0],
  ["beds", "Beds", 1],
  ["bathrooms", "Bathrooms", 1],
  ["price_rupees", "Price per night (₹)", 500],
  ["cleaning_fee_rupees", "Cleaning fee (₹)", 0],
] as const;

type Props = { listingId?: number; onDone: () => void };

/** The one form for creating and editing a listing. With `listingId` it loads and edits. */
export function ListingForm({ listingId, onDone }: Props) {
  const existing = useQuery({
    queryKey: ["listing-edit", listingId],
    queryFn: () => getListing(listingId as number),
    enabled: listingId !== undefined,
    gcTime: 0,
  });

  if (listingId !== undefined && !existing.data) {
    return existing.isError ? (
      <p role="alert" className="text-action">The listing could not be loaded.</p>
    ) : (
      <Skeleton className="h-64 rounded-control" />
    );
  }
  return (
    <Fields
      listingId={listingId}
      initial={existing.data ? toFormValues(existing.data) : EMPTY}
      onDone={onDone}
    />
  );
}

function Fields({ listingId, initial, onDone }: Props & { initial: ListingFormValues }) {
  const { meta } = useMeta();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(initial);
  const set = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (body: ListingFormValues) => (listingId === undefined ? createListing(body) : updateListing(listingId, body)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hosting-listings"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.show(listingId === undefined ? "Listing published" : "Listing updated");
      onDone();
    },
  });
  const messages = fieldMessages(save.error);
  const propertyType = values.property_type || meta?.property_types[0]?.slug || "";

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        // The select shows the first type before the host picks one; send what it shows.
        save.mutate({ ...values, property_type: propertyType });
      }}
    >
      <label className={LABEL}>
        Title
        <input className={INPUT} required minLength={5} maxLength={80} value={values.title} onChange={(e) => set("title", e.target.value)} />
      </label>
      <label className={LABEL}>
        Description
        <textarea className={`${INPUT} h-28 py-2`} required maxLength={5000} value={values.description} onChange={(e) => set("description", e.target.value)} />
      </label>
      <label className={LABEL}>
        Property type
        <select className={INPUT} value={propertyType} onChange={(e) => set("property_type", e.target.value)}>
          {meta?.property_types.map((type) => (
            <option key={type.slug} value={type.slug}>{type.name}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-4">
        <label className={LABEL}>
          City
          <input className={INPUT} required value={values.city} onChange={(e) => set("city", e.target.value)} />
        </label>
        <label className={LABEL}>
          State
          <input className={INPUT} value={values.state} onChange={(e) => set("state", e.target.value)} />
        </label>
        <label className={LABEL}>
          Country
          <input className={INPUT} required value={values.country} onChange={(e) => set("country", e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {NUMBERS.map(([key, label, min]) => (
          <label key={key} className={LABEL}>
            {label}
            <input className={INPUT} type="number" required min={min} step={key.endsWith("rupees") ? 100 : 1} value={values[key]} onChange={(e) => set(key, Number(e.target.value))} />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={values.pets_allowed} onChange={(e) => set("pets_allowed", e.target.checked)} />
        Pets allowed
      </label>
      <fieldset>
        <legend className="pb-2 text-sm font-medium">Amenities</legend>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {meta?.amenities.map((amenity) => (
            <label key={amenity.slug} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={values.amenities.includes(amenity.slug)}
                onChange={(e) =>
                  set("amenities", e.target.checked ? [...values.amenities, amenity.slug] : values.amenities.filter((slug) => slug !== amenity.slug))
                }
              />
              {amenity.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={LABEL}>
        Photo URLs (one https address per line)
        <textarea className={`${INPUT} h-24 py-2`} required value={values.photos} onChange={(e) => set("photos", e.target.value)} />
      </label>

      {save.isError && (
        <div role="alert" className="text-sm text-action">
          <p>{messages.length > 0 ? "Please correct these fields:" : "The listing could not be saved. Try again."}</p>
          <ul className="list-disc pl-5">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <Button type="submit" pending={save.isPending} disabled={!meta}>
          {listingId === undefined ? "Publish listing" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
