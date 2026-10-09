"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoginPrompt } from "@/components/booking/login-prompt";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { getBooking } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { TripReview } from "./review-form";
import { StatusTag, tripDates, tripGuests } from "./trip-parts";

/**
 * "Reservation details" (plan §6.7, §6.8): where a guest lands after paying, and what a
 * trip opens to. Only its guest and the listing's host can read a booking; for anyone
 * else the server answers 404.
 */
export function ReservationView() {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const { user, isLoading } = useCurrentUser();
  const hydrated = useHydrated();
  const valid = Number.isInteger(bookingId) && bookingId > 0;
  const booking = useQuery({
    queryKey: ["booking", bookingId, user?.id],
    queryFn: () => getBooking(bookingId),
    enabled: user !== null && valid,
    retry: false,
  });

  if (!hydrated || isLoading || (user && valid && booking.isPending)) {
    return <Skeleton className="mt-8 h-64 !rounded-xl" />;
  }
  if (!user) return <LoginPrompt line="Log in to see this reservation." />;
  if (!valid || (booking.error instanceof ApiError && booking.error.status === 404)) {
    return (
      <p className="pt-6 text-base leading-6 text-muted">
        We can’t find that reservation.{" "}
        <Link href="/trips" className="font-medium text-ink underline">
          Go to Trips
        </Link>
      </p>
    );
  }
  if (booking.isError || !booking.data) {
    return <p className="pt-6 text-base leading-6 text-muted">We could not load this reservation. Try again.</p>;
  }

  const trip = booking.data;
  const rows: [string, React.ReactNode][] = [
    ["Confirmation code", <span key="code" className="font-medium tracking-wider">{trip.confirmation_code}</span>],
    ["Dates", tripDates(trip)],
    ["Guests", tripGuests(trip)],
    ["Hosted by", trip.listing.host_name],
    ["Total paid", formatMoney(trip.total_minor)],
  ];

  return (
    <div className="mt-8 max-w-[640px] rounded-xl border border-line p-6">
      <div className="flex gap-4 border-b border-line pb-6">
        <span className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-line">
          {trip.listing.cover_photo && <ImageWithFallback src={trip.listing.cover_photo} alt="" sizes="96px" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {trip.listing.removed ? (
              <p className="text-base leading-5 font-medium">{trip.listing.title}</p>
            ) : (
              <Link href={`/rooms/${trip.listing.id}`} className="text-base leading-5 font-medium underline">
                {trip.listing.title}
              </Link>
            )}
            <StatusTag period={trip.period} />
          </div>
          <p className="pt-1 text-sm leading-[18px] text-muted">
            {trip.listing.removed
              ? "Listing no longer available"
              : [trip.listing.city, trip.listing.state, trip.listing.country].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>
      <dl className="grid gap-4 pt-6 text-base leading-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      {/* Only the guest reviews a stay; the host reads the same page without the form. */}
      {trip.guest.id === user.id && <TripReview trip={trip} />}
      <Link href="/trips" className="mt-6 inline-block text-base leading-5 font-medium underline">
        All trips
      </Link>
    </div>
  );
}
