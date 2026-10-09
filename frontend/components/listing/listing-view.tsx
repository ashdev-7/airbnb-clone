import { PawPrint } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { fetchListing, fetchReviews } from "@/lib/api/listings";
import { formatMonthYear, listingHeadline, plural } from "@/lib/format";
import { Amenities } from "./amenities";
import { BookingCard } from "./booking-card";
import { Gallery } from "./gallery";
import { LocationMap } from "./location-map";
import { PhotoViews } from "./photo-views";
import { RatingLine, Reviews } from "./reviews";
import { SectionNav } from "./section-nav";
import { StayCalendar } from "./stay-calendar";
import { TitleBar } from "./title-bar";

/** Capture C1: the page is 1120 px wide; the left column 653 px, the booking card 372 px. */
const PAGE = "mx-auto w-[1120px] max-w-[calc(100vw-2*var(--spacing-gutter))]";
const H2 = "text-[22px] leading-[26px] font-medium tracking-[-0.44px]";
const FIRST_REVIEWS = 6;

/** Ours: the listing API has no house rules, so these are the same for every place. */
const HOUSE_RULES = ["Check-in after 2:00 pm", "Checkout before 11:00 am"];

/**
 * The listing page (plan §6.6), rendered on the server from one listing and its first
 * reviews. An id that is not a listing, or a listing that was removed, is the 404 page.
 */
export async function ListingView({ id }: { id: Promise<string> }) {
  const text = await id;
  if (!/^\d{1,9}$/.test(text)) notFound();
  const listingId = Number(text);

  const [listing, reviews] = await Promise.all([
    fetchListing(listingId),
    fetchReviews(listingId, FIRST_REVIEWS),
  ]).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  const headline = listingHeadline(listing.property_type.name, listing.city);
  const place = [listing.city, listing.state, listing.country].filter(Boolean).join(", ");
  const rooms = [
    plural(listing.max_guests, "guest"),
    plural(listing.bedrooms, "bedroom"),
    plural(listing.beds, "bed"),
    plural(listing.bathrooms, "bathroom"),
  ].join(" · ");
  const bookable = {
    id: listing.id,
    max_guests: listing.max_guests,
    pets_allowed: listing.pets_allowed,
    price_per_night_minor: listing.price_per_night_minor,
  };

  return (
    <main className={`${PAGE} pb-12`}>
      <SectionNav listing={bookable} />
      <TitleBar
        listingId={listing.id}
        title={listing.title}
        summary={`${headline} · ${rooms}`}
        cover={listing.photos[0]}
      />
      <Gallery listingId={listing.id} photos={listing.photos} name={headline} />
      <PhotoViews listingId={listing.id} photos={listing.photos} name={headline} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-y-8 pt-8 lg:grid-cols-[minmax(0,653px)_372px] lg:justify-between">
        <div>
          <section className="pb-8">
            <h2 className={H2}>
              Entire {listing.property_type.name.toLowerCase()} in {listing.city}, {listing.country}
            </h2>
            <p className="pt-1 text-base leading-5">{rooms}</p>
            <p className="pt-2 text-base leading-5 font-medium">
              {listing.review_count === 0 ? (
                "New"
              ) : (
                <a href="#reviews" className="underline">
                  <RatingLine average={listing.rating_average} count={listing.review_count} />
                </a>
              )}
            </p>
          </section>

          <section className="flex items-center gap-6 border-t border-line py-6">
            <Avatar name={listing.host.name} avatarUrl={listing.host.avatar_url} />
            <div>
              <h2 className="text-base leading-5 font-medium">Hosted by {listing.host.name}</h2>
              <p className="pt-1 text-sm leading-[18px] text-muted">
                {listing.host.is_superhost && "Superhost · "}
                Hosting since {formatMonthYear(listing.host.joined_at)}
              </p>
            </div>
          </section>

          {listing.pets_allowed && (
            <section className="flex items-center gap-6 border-t border-line py-6">
              <span className="flex w-10 justify-center">
                <PawPrint size={24} strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <h3 className="text-sm leading-5 font-medium">Furry friends welcome</h3>
                <p className="text-sm leading-5 text-muted">Bring your pets along for the stay.</p>
              </div>
            </section>
          )}

          <section aria-label="About this place" className="border-t border-line py-8">
            <p className="text-base leading-6 whitespace-pre-line">{listing.description}</p>
          </section>

          <Amenities listingId={listing.id} amenities={listing.amenities} petsAllowed={listing.pets_allowed} />
          <StayCalendar listing={bookable} city={listing.city} />
        </div>
        <div>
          <BookingCard listing={bookable} />
        </div>
      </div>

      <Reviews listingId={listing.id} first={reviews} />

      <section id="location" aria-labelledby="location-heading" className="scroll-mt-24 border-t border-line py-12">
        <h2 id="location-heading" className={H2}>
          Where you’ll be
        </h2>
        <p className="pt-6 pb-6 text-base leading-5">{place}</p>
        <LocationMap latitude={listing.latitude} longitude={listing.longitude} place={place} />
      </section>

      <section aria-labelledby="host-heading" className="border-t border-line py-12">
        <h2 id="host-heading" className={H2}>
          Meet your host
        </h2>
        <div className="grid gap-8 pt-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-16">
          <div className="flex items-center gap-6 rounded-3xl bg-white p-8 shadow-[0_6px_20px_rgb(0_0_0/0.2)]">
            <Avatar name={listing.host.name} avatarUrl={listing.host.avatar_url} size={96} />
            <div>
              <p className="text-[26px] leading-[30px] font-bold tracking-[-0.52px]">{listing.host.name}</p>
              <p className="pt-1 text-xs leading-4 text-muted">{listing.host.is_superhost ? "Superhost" : "Host"}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg leading-6 font-medium">Host details</h3>
            <ul className="pt-4 text-base leading-6">
              <li>Hosting since {formatMonthYear(listing.host.joined_at)}</li>
              <li>{plural(listing.host.listing_count, "listing")}</li>
            </ul>
            {listing.host.is_superhost && (
              <>
                <h3 className="pt-6 text-lg leading-6 font-medium">{listing.host.name.split(" ")[0]} is a Superhost</h3>
                <p className="pt-2 text-base leading-5">
                  Superhosts are experienced, highly rated hosts who are committed to providing great stays for
                  guests.
                </p>
              </>
            )}
            {listing.host.bio && <p className="pt-4 text-base leading-6">{listing.host.bio}</p>}
            {/* Messaging is a placeholder in this project (plan §6.11). */}
            <Link
              href="/messages"
              className="mt-6 inline-flex h-12 items-center rounded-control bg-control px-6 text-base leading-5 font-medium hover:bg-line-soft"
            >
              Message host
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="know-heading" className="border-t border-line py-12">
        <h2 id="know-heading" className={H2}>
          Things to know
        </h2>
        <div className="grid gap-6 pt-6 text-sm leading-[18px] md:grid-cols-3">
          <div>
            <h3 className="pb-3 text-base leading-5 font-medium">House rules</h3>
            <ul className="grid gap-2 text-muted">
              {HOUSE_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
              <li>{plural(listing.max_guests, "guest")} maximum</li>
              <li>{listing.pets_allowed ? "Pets allowed" : "No pets"}</li>
            </ul>
          </div>
          <div>
            <h3 className="pb-3 text-base leading-5 font-medium">Safety</h3>
            <ul className="grid gap-2 text-muted">
              {["smoke-alarm", "first-aid-kit", "fire-extinguisher"].map((slug) => {
                const amenity = listing.amenities.find((item) => item.slug === slug);
                return <li key={slug}>{amenity ? amenity.name : `No ${slug.replace(/-/g, " ")} reported`}</li>;
              })}
            </ul>
          </div>
          <div>
            <h3 className="pb-3 text-base leading-5 font-medium">Cancellation policy</h3>
            <p className="text-muted">
              Reservations cannot be cancelled or changed online. Review the dates and the total before you
              pay.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

/** The loading state (plan §6.13): the shape of the page without its content. */
export function ListingSkeleton() {
  return (
    <main className={`${PAGE} pb-12`} role="status" aria-label="Loading the listing">
      <Skeleton className="mt-6 mb-6 h-[30px] w-1/2" />
      <Skeleton className="h-[353px] !rounded-xl" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-y-8 pt-8 lg:grid-cols-[minmax(0,653px)_372px] lg:justify-between">
        <div className="grid gap-4">
          <Skeleton className="h-[26px] w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-8 h-24" />
        </div>
        <Skeleton className="h-[315px] !rounded-xl" />
      </div>
    </main>
  );
}
