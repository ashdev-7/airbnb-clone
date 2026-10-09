"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useStay } from "@/hooks/use-stay";
import { getReviews } from "@/lib/api/stay";
import { formatMonthYear, formatRating, plural } from "@/lib/format";
import type { Review, ReviewPage } from "@/types/api";

type Props = { listingId: number; first: ReviewPage };

/** "★ 4.84 · 57 reviews"; before three reviews there is no average (REF-R1). */
export function RatingLine({ average, count }: { average: number | null; count: number }) {
  if (count === 0) return <>No reviews yet</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {average !== null && (
        <>
          <Star size={14} fill="currentColor" strokeWidth={0} aria-hidden />
          {formatRating(average)}
          <span aria-hidden>·</span>
        </>
      )}
      {plural(count, "review")}
    </span>
  );
}

/**
 * One review (capture C8): a 48 px portrait, the name in 14 px medium, small stars and
 * the month it was written, then the text. In the page the text is cut at three lines.
 */
function ReviewCard({ review, clamp }: { review: Review; clamp: boolean }) {
  return (
    <article>
      <div className="flex items-center gap-3">
        <Avatar name={review.author.name} avatarUrl={review.author.avatar_url} size={48} />
        <h3 className="text-sm leading-[18px] font-medium">{review.author.name}</h3>
      </div>
      <p className="flex items-center gap-2 pt-2 text-sm leading-[18px]">
        <span className="flex" role="img" aria-label={`Rated ${review.rating} out of 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={9}
              strokeWidth={0}
              fill="currentColor"
              className={index < review.rating ? "" : "text-line"}
              aria-hidden
            />
          ))}
        </span>
        <span aria-hidden>·</span>
        <span className="text-muted">{formatMonthYear(review.created_at)}</span>
      </p>
      <p className={`pt-1 text-base leading-6 ${clamp ? "line-clamp-3" : ""}`}>{review.comment}</p>
    </article>
  );
}

/**
 * Reviews (R-LD-5; captures C1, C8): the rating and count, six reviews in two columns,
 * and a grey button that opens them all. The first page is rendered by the server; the
 * modal fetches further pages as they are asked for.
 */
export function Reviews({ listingId, first }: Props) {
  const { stay, openModal, closeModal } = useStay(listingId);
  const open = stay.modal === "reviews";

  const pages = useInfiniteQuery({
    queryKey: ["reviews", listingId],
    queryFn: ({ pageParam }) => getReviews(listingId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled: open,
  });
  const all = pages.data?.pages.flatMap((page) => page.items) ?? first.items;

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-24 border-t border-line py-12">
      <h2 id="reviews-heading" className="text-[22px] leading-[26px] font-medium tracking-[-0.44px]">
        <RatingLine average={first.rating_average} count={first.total} />
      </h2>
      {first.total === 0 ? (
        <p className="pt-4 text-muted">This place has not been reviewed yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-24 gap-y-10 pt-8">
          {first.items.slice(0, 6).map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} clamp />
            </li>
          ))}
        </ul>
      )}
      {first.total > 0 && (
        <Button variant="soft" className="mt-10" onClick={() => openModal("reviews")}>
          Show all {plural(first.total, "review")}
        </Button>
      )}

      <Modal open={open} onOpenChange={(next) => !next && closeModal()} title="Reviews" titleHidden size="xl">
        <h2 className="pb-8 text-[26px] leading-[30px] font-medium">
          <RatingLine average={first.rating_average} count={first.total} />
        </h2>
        <ul className="grid gap-10">
          {all.map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} clamp={false} />
            </li>
          ))}
        </ul>
        {pages.isError && (
          <p role="alert" className="pt-6 text-action">
            The reviews could not be loaded. Try again.
          </p>
        )}
        {(pages.hasNextPage || pages.isError) && (
          <Button
            variant="outline"
            className="mt-8"
            pending={pages.isFetchingNextPage}
            onClick={() => (pages.isError ? pages.refetch() : pages.fetchNextPage())}
          >
            Show more reviews
          </Button>
        )}
      </Modal>
    </section>
  );
}
