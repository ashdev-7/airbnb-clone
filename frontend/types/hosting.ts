/** Types for the hosting screens, mirroring the API (plan §11). */

export type Reservation = {
  id: number;
  confirmation_code: string;
  status: string;
  period: "upcoming" | "current" | "past" | "cancelled";
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  total_minor: number;
  listing: { id: number; title: string; city: string; cover_photo: string | null; removed: boolean };
  guest: { id: number; name: string };
};

/** What the listing form holds. Prices are whole rupees, as the host types them. */
export type ListingFormValues = {
  title: string;
  description: string;
  property_type: string;
  city: string;
  state: string;
  country: string;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  price_rupees: number;
  cleaning_fee_rupees: number;
  pets_allowed: boolean;
  amenities: string[];
  /** One https address per line. */
  photos: string;
};
