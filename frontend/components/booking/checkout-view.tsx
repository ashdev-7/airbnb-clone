"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PriceBreakdown } from "@/components/listing/price-breakdown";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { useToast } from "@/hooks/use-toast";
import { createBooking, getListing } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";
import { getQuote } from "@/lib/api/stay";
import { formatLongDay, listingHeadline } from "@/lib/format";
import { guestSummary } from "@/lib/guests";
import type { RawParams } from "@/lib/search-params";
import { hasDates, parseStay, quoteQuery, stayHref } from "@/lib/stay-params";
import type { PaymentMethod } from "@/types/booking";
import { LoginPrompt } from "./login-prompt";

/** Two saved test cards (plan §6.7): there is no field for a card number anywhere. */
const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "demo_card_ok", label: "Test card ending 4242 (approves)" },
  { value: "demo_card_declined", label: "Test card ending 0002 (always declined)" },
];

type Problem = { text: string; backToListing?: boolean };

const H2 = "text-[22px] leading-[26px] font-medium";

/**
 * Checkout (plan §6.7): the trip, the server's price, a test payment method and "Confirm
 * and pay". The total sent is the one shown; the server compares it with its own, so a
 * price that changed meanwhile is caught there, not here (plan §10.3).
 */
export function CheckoutView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const hydrated = useHydrated();
  const { user, isLoading } = useCurrentUser();
  const params = useParams<{ listingId: string }>();
  const searchParams = useSearchParams();
  const listingId = Number(params.listingId);

  const stay = useMemo(() => {
    const raw: RawParams = {};
    for (const [key, value] of searchParams) raw[key] = value;
    return parseStay(raw);
  }, [searchParams]);
  const listingHrefWithStay = stayHref(listingId, { ...stay, modal: null });
  const query = quoteQuery(stay);
  const ready = Number.isInteger(listingId) && listingId > 0 && query !== null && user !== null;

  const listing = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => getListing(listingId),
    enabled: ready,
    retry: false,
  });
  const quote = useQuery({
    queryKey: ["quote", listingId, query],
    queryFn: () => getQuote(listingId, query ?? ""),
    enabled: ready,
    retry: false,
  });

  const [method, setMethod] = useState<PaymentMethod>("demo_card_ok");
  // One key per attempt: a double click or a retry repeats it; a decline or a new price
  // starts a new attempt.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  async function confirm() {
    if (!quote.data || !hasDates(stay) || submitting) return;
    setSubmitting(true);
    setProblem(null);
    try {
      const booking = await createBooking(
        {
          listing_id: listingId,
          check_in: stay.checkIn,
          check_out: stay.checkOut,
          ...stay.guests,
          payment_method: method,
          expected_total_minor: quote.data.total_minor,
        },
        key,
      );
      // The listing page may still be mounted: its calendar and price must not offer these nights.
      void queryClient.invalidateQueries({ queryKey: ["availability", listingId] });
      void queryClient.invalidateQueries({ queryKey: ["quote", listingId] });
      toast.show("Booking confirmed");
      router.replace(`/trips/${booking.id}`);
      return;
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      if (code === "payment_declined") {
        toast.show("Payment declined");
        setProblem({ text: "Your payment was declined. Nothing was booked. Choose another payment method." });
        setKey(crypto.randomUUID());
      } else if (code === "dates_unavailable") {
        setProblem({ text: "Those dates were just booked by someone else.", backToListing: true });
        // The listing's calendar must show them taken. (The price here is left as it is:
        // asking again would replace this message with the page's own refusal.)
        void queryClient.invalidateQueries({ queryKey: ["availability", listingId] });
      } else if (code === "price_changed") {
        setProblem({ text: "The price changed. Review the new total and confirm again." });
        setKey(crypto.randomUUID());
        await quote.refetch();
      } else if (error instanceof ApiError && (error.status === 403 || error.status === 422)) {
        setProblem({ text: error.message, backToListing: true });
      } else {
        setProblem({ text: "Something went wrong, try again." });
      }
    }
    setSubmitting(false);
  }

  let body;
  if (!hydrated || isLoading) {
    body = <Skeleton className="mt-6 h-64 rounded-control" />;
  } else if (!user) {
    body = <LoginPrompt line="Log in to book this stay. Nothing is charged until you confirm." />;
  } else if (query === null) {
    body = (
      <p className="pt-6 text-base leading-6 text-muted">
        Choose your dates first.{" "}
        <Link href={listingHrefWithStay} className="font-medium text-ink underline">
          Back to the listing
        </Link>
      </p>
    );
  } else if (listing.isError || quote.isError) {
    const taken = quote.error instanceof ApiError && quote.error.code === "dates_unavailable";
    body = (
      <p role="alert" className="pt-6 text-base leading-6">
        {taken
          ? "Those dates are no longer available."
          : quote.error instanceof ApiError && quote.error.status === 422
            ? quote.error.message
            : "We could not load this stay."}{" "}
        <Link href={listingHrefWithStay} className="font-medium underline">
          Back to the listing
        </Link>
      </p>
    );
  } else if (!listing.data || !quote.data || !hasDates(stay)) {
    body = <Skeleton className="mt-6 h-64 rounded-control" />;
  } else {
    const home = listing.data;
    body = (
      <div className="grid gap-12 pt-8 md:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <section className="border-b border-line pb-8">
            <h2 className={H2}>Your trip</h2>
            <dl className="grid gap-4 pt-6 text-base leading-5">
              <div>
                <dt className="font-medium">Dates</dt>
                <dd className="pt-1 text-muted">
                  {formatLongDay(stay.checkIn)} - {formatLongDay(stay.checkOut)}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Guests</dt>
                <dd className="pt-1 text-muted">{guestSummary(stay.guests)}</dd>
              </div>
            </dl>
          </section>

          <fieldset className="border-b border-line py-8">
            <legend className={H2}>Pay with</legend>
            <div className="grid gap-3 pt-6">
              {METHODS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-control border px-4 py-4 text-base leading-5 ${
                    method === value ? "border-ink" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={value}
                    checked={method === value}
                    onChange={() => setMethod(value)}
                    className="size-4 accent-[var(--color-ink)]"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="pt-3 text-sm leading-[18px] text-muted">
              These are test cards. No real payment is taken.
            </p>
          </fieldset>

          <div className="pt-8">
            {problem && (
              <p role="alert" className="pb-4 text-base leading-6 text-action">
                {problem.text}{" "}
                {problem.backToListing && (
                  <Link href={listingHrefWithStay} className="font-medium underline">
                    Back to the listing
                  </Link>
                )}
              </p>
            )}
            <Button onClick={confirm} pending={submitting} className="min-w-[200px]">
              Confirm and pay
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-line p-6">
          <div className="flex gap-4 border-b border-line pb-6">
            <span className="relative size-[104px] shrink-0 overflow-hidden rounded-lg bg-line">
              {home.photos[0] && <ImageWithFallback src={home.photos[0]} alt="" sizes="104px" />}
            </span>
            <div>
              <p className="text-base leading-5 font-medium">{home.title}</p>
              <p className="pt-1 text-sm leading-[18px] text-muted">
                {listingHeadline(home.property_type.name, home.city)}
              </p>
            </div>
          </div>
          <h2 className={`${H2} py-6`}>Price details</h2>
          <PriceBreakdown quote={quote.data} />
        </aside>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-6 py-10">
      <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.96px]">Confirm and pay</h1>
      {body}
    </main>
  );
}
