"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api/errors";
import { getMyListings, getReservations, removeListing } from "@/lib/api/hosting";
import { formatLongDay, formatMoney } from "@/lib/format";
import { guestSummary } from "@/lib/guests";
import type { ListingCard } from "@/types/api";
import { ListingForm } from "./listing-form";

type Tab = "listings" | "reservations";
const PAGE = "mx-auto w-full max-w-[1120px] flex-1 px-6 py-10";

/** Hosting: the host's listings (create, edit, remove) and the reservations on them. */
export function HostingView({ initialTab = "listings", title = "Hosting" }: { initialTab?: Tab; title?: string }) {
  const { user, isLoading, requestLogin } = useCurrentUser();
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <main className={PAGE}>
      <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.96px]">{title}</h1>
      {!hydrated || isLoading ? (
        <Skeleton className="mt-8 h-40 rounded-control" />
      ) : !user ? (
        <div className="pt-6">
          <p className="pb-4 text-muted">Log in to manage your listings and reservations.</p>
          <Button onClick={() => requestLogin()}>Log in</Button>
        </div>
      ) : (
        <>
          <div role="tablist" className="mt-6 flex gap-6 border-b border-line">
            {(["listings", "reservations"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                onClick={() => setTab(name)}
                className={`-mb-px border-b-2 pb-3 text-base font-medium capitalize ${tab === name ? "border-ink" : "border-transparent text-muted"}`}
              >
                {name}
              </button>
            ))}
          </div>
          {tab === "listings" ? <Listings /> : <Reservations />}
        </>
      )}
    </main>
  );
}

function Listings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const listings = useQuery({ queryKey: ["hosting-listings"], queryFn: getMyListings });
  /** "new", the id being edited, or null when the form is closed. */
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [removing, setRemoving] = useState<ListingCard | null>(null);

  const remove = useMutation({
    mutationFn: (listingId: number) => removeListing(listingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hosting-listings"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.show("Listing removed");
      setRemoving(null);
    },
  });
  const blocked = remove.error instanceof ApiError && remove.error.code === "listing_has_upcoming_reservations";
  const items = listings.data?.items ?? [];

  return (
    <section className="pt-6">
      <Button variant="dark" onClick={() => setEditing("new")}>Create listing</Button>
      {listings.isPending && <Skeleton className="mt-6 h-40 rounded-control" />}
      {listings.isError && <p role="alert" className="pt-6 text-action">Your listings could not be loaded.</p>}
      {listings.isSuccess && items.length === 0 && <p className="pt-6 text-muted">Create your first listing</p>}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-6">
        {items.map((listing) => (
          <li key={listing.id} className="flex flex-wrap items-center gap-4 rounded-control border border-line p-3">
            <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-line">
              {listing.photos[0] && <ImageWithFallback src={listing.photos[0]} alt="" sizes="96px" />}
            </span>
            <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-7rem)]">
              <h2 className="truncate text-base font-medium">{listing.title}</h2>
              <p className="text-sm text-muted">
                {listing.city} · {formatMoney(listing.price_per_night_minor)} per night · Listed
              </p>
            </div>
            <Button variant="outline" aria-label={`Edit ${listing.title}`} onClick={() => setEditing(listing.id)}>Edit</Button>
            <Button
              variant="outline"
              aria-label={`Remove ${listing.title}`}
              onClick={() => {
                remove.reset();
                setRemoving(listing);
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      {editing !== null && (
        <Modal open onOpenChange={(open) => !open && setEditing(null)} title={editing === "new" ? "Create listing" : "Edit listing"} size="xl">
          <ListingForm listingId={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
      {removing && (
        <Modal open onOpenChange={(open) => !open && setRemoving(null)} title="Remove this listing?">
          <p className="pb-4">“{removing.title}” will no longer be shown or bookable. Past trips keep their record.</p>
          {remove.isError && (
            <p role="alert" className="pb-4 text-action">
              {blocked ? "This listing has upcoming reservations, so it cannot be removed yet." : "The listing could not be removed. Try again."}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="dark" pending={remove.isPending} onClick={() => remove.mutate(removing.id)}>Remove</Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function Reservations() {
  const reservations = useQuery({ queryKey: ["hosting-reservations"], queryFn: getReservations });
  const items = reservations.data?.items ?? [];

  if (reservations.isPending) return <Skeleton className="mt-6 h-40 rounded-control" />;
  if (reservations.isError) return <p role="alert" className="pt-6 text-action">Your reservations could not be loaded.</p>;
  if (items.length === 0) return <p className="pt-6 text-muted">No reservations yet</p>;

  return (
    <ul aria-label="Reservations" className="grid grid-cols-[minmax(0,1fr)] gap-3 pt-6">
      {items.map((reservation) => (
        <li key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line p-4">
          <div>
            <h2 className="text-base font-medium">{reservation.guest.name}</h2>
            <p className="text-sm text-muted">
              {reservation.listing.title}
              {reservation.listing.removed && " (removed)"}
            </p>
            <p className="text-sm">
              {formatLongDay(reservation.check_in)} - {formatLongDay(reservation.check_out)} · {guestSummary(reservation)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-medium">{formatMoney(reservation.total_minor)}</p>
            <p className="text-sm text-muted capitalize">{reservation.period}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
