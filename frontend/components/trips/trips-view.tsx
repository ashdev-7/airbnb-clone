"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoginPrompt } from "@/components/booking/login-prompt";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { getTrips } from "@/lib/api/bookings";
import { formatMoney } from "@/lib/format";
import type { Booking } from "@/types/booking";
import { StatusTag, tripDates, tripGuests } from "./trip-parts";

function TripRow({ booking }: { booking: Booking }) {
  return (
    <li>
      <Link
        href={`/trips/${booking.id}`}
        aria-label={`Reservation ${booking.confirmation_code}: ${booking.listing.title}`}
        className="flex gap-4 rounded-xl border border-line p-4 hover:bg-surface"
      >
        <span className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-line">
          {booking.listing.cover_photo && (
            <ImageWithFallback src={booking.listing.cover_photo} alt="" sizes="96px" />
          )}
        </span>
        <span className="min-w-0 flex-1 text-sm leading-[18px]">
          <span className="flex items-start justify-between gap-3">
            <span className="truncate text-base leading-5 font-medium">{booking.listing.title}</span>
            <StatusTag period={booking.period} />
          </span>
          <span className="block pt-1 text-muted">
            {booking.listing.removed ? "Listing no longer available" : `${booking.listing.city}, ${booking.listing.country}`}
          </span>
          <span className="block pt-1 text-muted">{tripDates(booking)}</span>
          <span className="block pt-1 text-muted">
            {tripGuests(booking)} · {formatMoney(booking.total_minor)} total
          </span>
          {booking.can_review && <span className="block pt-1 font-medium text-ink underline">Write a review</span>}
        </span>
      </Link>
    </li>
  );
}

function Section({ title, bookings }: { title: string; bookings: Booking[] }) {
  if (bookings.length === 0) return null;
  return (
    <section aria-label={title} className="pt-8">
      <h2 className="pb-4 text-[22px] leading-[26px] font-medium">{title}</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {bookings.map((booking) => (
          <TripRow key={booking.id} booking={booking} />
        ))}
      </ul>
    </section>
  );
}

/** Trips (plan §6.8): current and upcoming reservations, then past, then cancelled. */
export function TripsView() {
  const { user, isLoading } = useCurrentUser();
  const hydrated = useHydrated();
  const trips = useQuery({ queryKey: ["trips", user?.id], queryFn: getTrips, enabled: user !== null });

  if (!hydrated || isLoading || (user && trips.isPending)) {
    return (
      <div className="grid gap-4 pt-8 md:grid-cols-2" role="status" aria-label="Loading your trips">
        <Skeleton className="h-[130px] !rounded-xl" />
        <Skeleton className="h-[130px] !rounded-xl" />
      </div>
    );
  }
  if (!user) return <LoginPrompt line="Log in to see your reservations." />;
  if (trips.isError || !trips.data) {
    return (
      <div className="pt-6">
        <p className="pb-6 text-base leading-6 text-muted">We could not load your trips.</p>
        <Button variant="dark" onClick={() => trips.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const items = trips.data.items;
  if (items.length === 0) {
    return (
      <div className="pt-6">
        <p className="max-w-[480px] pb-6 text-base leading-6 text-muted">
          No trips booked yet. After you book a stay, it will be listed here.
        </p>
        <Link href="/" className="inline-flex h-12 items-center rounded-control bg-ink px-6 text-base leading-5 font-medium text-white">
          Start exploring
        </Link>
      </div>
    );
  }

  const of = (...periods: string[]) => items.filter((booking) => periods.includes(booking.period));
  return (
    <>
      <Section title="Upcoming" bookings={of("current", "upcoming")} />
      <Section title="Past trips" bookings={of("past")} />
      <Section title="Cancelled" bookings={of("cancelled")} />
    </>
  );
}
