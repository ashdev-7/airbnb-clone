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
