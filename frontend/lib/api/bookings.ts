import type { Booking, BookingRequest } from "@/types/booking";
import type { ListingDetail } from "@/types/api";
import { api } from "./client";

/**
 * Books a stay. The idempotency key makes the request safe to repeat: a double click or a
 * retry with the same key returns the first booking instead of making a second one.
 */
export const createBooking = (body: BookingRequest, idempotencyKey: string) =>
  api<Booking>("/bookings", {
    method: "POST",
    body,
    headers: { "Idempotency-Key": idempotencyKey },
    idempotent: true,
  });

/** The signed-in user's trips, latest first. */
export const getTrips = () => api<{ items: Booking[] }>("/bookings");

export const getBooking = (bookingId: number) => api<Booking>(`/bookings/${bookingId}`);

/** The listing being booked, for the trip summary at checkout. */
export const getListing = (listingId: number) => api<ListingDetail>(`/listings/${listingId}`);
