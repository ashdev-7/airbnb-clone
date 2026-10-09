import type { ListingCard, ListingDetail } from "@/types/api";
import type { ListingFormValues, Reservation } from "@/types/hosting";
import { api } from "./client";
import { ApiError } from "./errors";

const MINOR_PER_RUPEE = 100;

export const getMyListings = () => api<{ items: ListingCard[] }>("/hosting/listings");

export const getReservations = () => api<{ items: Reservation[] }>("/hosting/reservations");

export const getListing = (listingId: number) => api<ListingDetail>(`/listings/${listingId}`);

/** The form as the API wants it: prices in paise, photos as a list. No host id is sent. */
function toBody(values: ListingFormValues) {
  return {
    title: values.title,
    description: values.description,
    property_type: values.property_type,
    city: values.city,
    state: values.state.trim() || null,
    country: values.country,
    price_per_night_minor: Math.round(values.price_rupees) * MINOR_PER_RUPEE,
    cleaning_fee_minor: Math.round(values.cleaning_fee_rupees) * MINOR_PER_RUPEE,
    max_guests: values.max_guests,
    bedrooms: values.bedrooms,
    beds: values.beds,
    bathrooms: values.bathrooms,
    pets_allowed: values.pets_allowed,
    photos: values.photos
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    amenities: values.amenities,
  };
}

export const createListing = (values: ListingFormValues) =>
  api<ListingDetail>("/listings", { method: "POST", body: toBody(values) });

export const updateListing = (listingId: number, values: ListingFormValues) =>
  api<ListingDetail>(`/listings/${listingId}`, { method: "PATCH", body: toBody(values) });

export const removeListing = (listingId: number) =>
  api<void>(`/listings/${listingId}`, { method: "DELETE" });

/** A listing from the API as the form holds it. */
export function toFormValues(listing: ListingDetail): ListingFormValues {
  return {
    title: listing.title,
    description: listing.description,
    property_type: listing.property_type.slug,
    city: listing.city,
    state: listing.state ?? "",
    country: listing.country,
    max_guests: listing.max_guests,
    bedrooms: listing.bedrooms,
    beds: listing.beds,
    bathrooms: listing.bathrooms,
    price_rupees: listing.price_per_night_minor / MINOR_PER_RUPEE,
    cleaning_fee_rupees: listing.cleaning_fee_minor / MINOR_PER_RUPEE,
    pets_allowed: listing.pets_allowed,
    amenities: listing.amenities.map((amenity) => amenity.slug),
    photos: listing.photos.join("\n"),
  };
}

/** The field messages of a 422 answer, as "field: message" lines. */
export function fieldMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  const fields = error.details.fields;
  if (!Array.isArray(fields)) return [];
  return fields.map((field: { path?: string; message?: string }) =>
    `${(field.path ?? "").replace(/^body\./, "").replace(/_minor$/, "").replace(/_/g, " ")}: ${field.message ?? ""}`,
  );
}
