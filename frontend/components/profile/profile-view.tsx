"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoginPrompt } from "@/components/booking/login-prompt";
import { Stars } from "@/components/trips/review-form";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { getMyReviews } from "@/lib/api/reviews";
import { SITE_NAME } from "@/lib/config";
import { formatMonthYear } from "@/lib/format";

const SOON = "/coming-soon";
const ROW = "flex h-[60px] items-center gap-4 rounded-2xl px-4 text-base leading-5 font-medium";
const H1 = "text-[32px] leading-9 font-semibold tracking-[-0.96px]";

/**
 * The profile page (plan §6.15; capture G1): a left column with "About me" and
 * "Connections", and the card with the user's initial, name and "Guest" or "Host".
 * It is read-only: "Edit", "Get started" and "Connections" lead to "Coming soon".
 */
export function ProfileView() {
  const { user, isLoading } = useCurrentUser();
  const hydrated = useHydrated();
  const [showReviews, setShowReviews] = useState(false);
  const reviews = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: getMyReviews,
    enabled: user !== null && showReviews,
  });

  if (!hydrated || isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-9">
        <Skeleton className="h-64 !rounded-3xl" />
      </main>
    );
  }
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-9">
        <h1 className={H1}>Profile</h1>
        <LoginPrompt line="Log in to see your profile." />
      </main>
    );
  }

  const items = reviews.data?.items ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-6 py-9 md:flex-row md:gap-16 md:px-12">
      <nav aria-label="Profile sections" className="md:w-[314px] md:shrink-0">
        <p className={`${H1} pb-8`}>Profile</p>
        <Link href="/users/profile" aria-current="page" className={`${ROW} bg-control`}>
          <Avatar name={user.name} avatarUrl={user.avatar_url} />
          About me
        </Link>
        <Link href={SOON} className={`${ROW} hover:bg-surface`}>
          <span className="flex size-10 items-center justify-center rounded-full bg-control">
            <Users size={20} aria-hidden />
          </span>
          Connections
        </Link>
      </nav>

      <main className="min-w-0 flex-1">
        <div className="flex items-center gap-5">
          <h1 className={H1}>About me</h1>
          <Link href={SOON} className="rounded-lg bg-control px-4 py-2 text-xs leading-4 font-medium">
            Edit
          </Link>
        </div>

        <div className="flex flex-col gap-10 pt-6 md:flex-row md:items-center">
          <div className="flex w-full max-w-[345px] flex-col items-center rounded-3xl bg-paper px-6 py-8 shadow-[0_0_0_1px_rgb(0_0_0/0.02),0_8px_24px_rgb(0_0_0/0.1)]">
            <Avatar name={user.name} avatarUrl={user.avatar_url} size={104} />
            <p className={`${H1} pt-2`}>{user.name.split(" ")[0]}</p>
            <p className="text-xs leading-4 text-muted">{user.is_host ? "Host" : "Guest"}</p>
          </div>
          <div className="max-w-[307px]">
            <h2 className="text-[22px] leading-[26px] font-medium tracking-[-0.44px]">Complete your profile</h2>
            <p className="pt-4 text-sm leading-[18px] text-muted">
              Your {SITE_NAME} profile is an important part of every reservation. Create yours to help other
              hosts and guests get to know you.
            </p>
            <Link
              href={SOON}
              className="mt-6 inline-block rounded-xl px-6 py-3.5 text-base leading-5 font-medium text-white [background:var(--gradient-primary)]"
            >
              Get started
            </Link>
          </div>
        </div>

        <section className="mt-10 border-t border-line pt-6">
          <button
            type="button"
            aria-expanded={showReviews}
            onClick={() => setShowReviews((shown) => !shown)}
            className="-mx-3 flex w-[calc(100%+24px)] items-center justify-between rounded-xl p-3 text-left text-base leading-5 hover:bg-surface"
          >
            {showReviews ? "Hide reviews I’ve written" : "Show reviews I’ve written"}
            <ChevronRight size={20} className={showReviews ? "rotate-90" : ""} aria-hidden />
          </button>
          {showReviews && reviews.isPending && <Skeleton className="mt-4 h-24 !rounded-xl" />}
          {showReviews && reviews.isError && (
            <p role="alert" className="pt-4 text-base leading-6 text-muted">
              Your reviews could not be loaded. Try again.
            </p>
          )}
          {showReviews && reviews.isSuccess && items.length === 0 && (
            <p className="pt-4 text-base leading-6 text-muted">
              You have not written a review yet. After a stay ends, you can review it from{" "}
              <Link href="/trips" className="font-medium text-ink underline">
                Trips
              </Link>
              .
            </p>
          )}
          {showReviews && items.length > 0 && (
            <ul aria-label="Reviews I’ve written" className="grid gap-6 pt-4">
              {items.map((review) => (
                <li key={review.id} className="rounded-xl border border-line p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {review.listing.removed ? (
                      <p className="text-base leading-5 font-medium">{review.listing.title}</p>
                    ) : (
                      <Link href={`/rooms/${review.listing.id}`} className="text-base leading-5 font-medium underline">
                        {review.listing.title}
                      </Link>
                    )}
                    <span className="text-sm leading-[18px] text-muted">
                      {review.listing.city} · {formatMonthYear(review.created_at)}
                    </span>
                  </div>
                  <p className="pt-2">
                    <Stars rating={review.rating} />
                  </p>
                  <p className="pt-2 text-base leading-6 whitespace-pre-line">{review.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
