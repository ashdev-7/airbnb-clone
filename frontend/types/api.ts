/** Types mirroring the API schemas (plan §11). */

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    request_id: string;
  };
};

export type User = {
  id: number;
  name: string;
  avatar_url: string | null;
  /** A host is a user who owns a listing. */
  is_host: boolean;
};

export type Me = { user: User | null };

export type DemoAccounts = { accounts: User[] };

export type PropertyType = { slug: string; name: string };

export type ListingCard = {
  id: number;
  title: string;
  property_type: PropertyType;
  city: string;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pets_allowed: boolean;
  /** Integer paise. */
  price_per_night_minor: number;
  currency: string;
  /** Null until the listing has three reviews. */
  rating_average: number | null;
  review_count: number;
  /** At least five reviews averaging 4.9 or more (decided by the server). */
  guest_favourite: boolean;
  /** The full price of the searched stay; null when no dates were given. */
  stay_total_minor: number | null;
};

export type ListingPage = {
  items: ListingCard[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type WishlistIds = { ids: number[] };

export type Amenity = { slug: string; name: string; category: string };

export type HistogramBucket = { from_minor: number; to_minor: number; count: number };

/** What the filters modal needs about a search: how many homes, and their prices. */
export type ListingSummary = {
  total: number;
  price_min_minor: number | null;
  price_max_minor: number | null;
  currency: string;
  histogram: HistogramBucket[];
};

/** A place suggestion. `label` is what is shown and what is sent back as the location. */
export type LocationSuggestion = {
  kind: "city" | "state" | "country";
  label: string;
  city: string | null;
  state: string | null;
  country: string;
  listing_count: number;
};

export type Meta = {
  property_types: PropertyType[];
  amenities: Amenity[];
  amenity_categories: string[];
  service_fee_bps: number;
  currency: string;
  guest_limits: { min_adults: number; max_guests: number; max_infants: number; max_pets: number };
  default_page_size: number;
  max_page_size: number;
};

export type Host = {
  id: number;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  joined_at: string;
  listing_count: number;
  /** At least ten completed stays and a rating of 4.8 or more (decided by the server). */
  is_superhost: boolean;
};

export type ListingDetail = ListingCard & {
  description: string;
  cleaning_fee_minor: number;
  amenities: Amenity[];
  host: Host;
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  author: { name: string; avatar_url: string | null };
};

export type ReviewPage = {
  items: Review[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  /** Null until the listing has three reviews. */
  rating_average: number | null;
};

/** Confirmed stays on a listing. It never says who booked. */
export type Availability = {
  listing_id: number;
  start: string;
  end: string;
  booked: { check_in: string; check_out: string }[];
};

/** The price of a stay, computed by the server (plan §10.4). */
export type Quote = {
  check_in: string;
  check_out: string;
  nights: number;
  nightly_price_minor: number;
  nights_total_minor: number;
  cleaning_fee_minor: number;
  service_fee_minor: number;
  service_fee_bps: number;
  total_minor: number;
  currency: string;
};
