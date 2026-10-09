/** Types mirroring the booking API (backend/app/bookings/schemas.py). */

export type PaymentMethod = "demo_card_ok" | "demo_card_declined";

export type BookingPeriod = "upcoming" | "current" | "past" | "cancelled";

export type Booking = {
  id: number;
  confirmation_code: string;
  status: string;
  /** Derived by the server from the dates and today. */
  period: BookingPeriod;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  nightly_price_minor: number;
  nights_total_minor: number;
  cleaning_fee_minor: number;
  service_fee_minor: number;
  total_minor: number;
  currency: string;
  created_at: string;
  listing: {
    id: number;
    title: string;
    city: string;
    state: string | null;
    country: string;
    cover_photo: string | null;
    host_id: number;
    host_name: string;
    /** True once the host has removed the listing. */
    removed: boolean;
  };
  guest: { id: number; name: string; avatar_url: string | null };
};

/** The body of POST /api/bookings. The guest is the signed-in user, never sent. */
export type BookingRequest = {
  listing_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  payment_method: PaymentMethod;
  /** The total the guest saw; the server compares it with its own and never charges it. */
  expected_total_minor: number;
};
