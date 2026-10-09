"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api/errors";
import { writeReview } from "@/lib/api/reviews";
import type { Booking } from "@/types/booking";

const RATINGS = [1, 2, 3, 4, 5] as const;
const MAX_COMMENT = 2000;

/** The stars of a rating, for reading: "4 out of 5". */
export function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5`} className="inline-flex gap-0.5">
      {RATINGS.map((value) => (
        <Star
          key={value}
          size={14}
          strokeWidth={0}
          fill="currentColor"
          className={value <= rating ? "text-ink" : "text-line"}
          aria-hidden
        />
      ))}
    </span>
  );
}

/**
 * The review of a stay (plan §10.7, bonus B2): the review itself once written, or the
 * form while the server says one may be written. Whether it may is the server's decision
 * (`can_review`); the form only collects the stars and the words.
 */
export function TripReview({ trip }: { trip: Booking }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const save = useMutation({
    mutationFn: () => writeReview(trip.id, { rating, comment }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking", trip.id] });
      void queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.show("Review posted");
      setRating(0);
      setComment("");
    },
  });

  if (trip.review) {
    return (
      <section aria-label="Your review" className="mt-6 border-t border-line pt-6">
        <h2 className="text-base leading-5 font-medium">Your review</h2>
        <p className="pt-2">
          <Stars rating={trip.review.rating} />
        </p>
        <p className="pt-2 text-base leading-6 whitespace-pre-line">{trip.review.comment}</p>
      </section>
    );
  }
  if (!trip.can_review) return null;

  return (
    <form
      aria-label="Review your stay"
      className="mt-6 border-t border-line pt-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (rating > 0 && comment.trim()) save.mutate();
      }}
    >
      <h2 className="text-base leading-5 font-medium">How was your stay?</h2>
      <fieldset className="pt-3">
        <legend className="sr-only">Rating</legend>
        <div className="flex gap-1">
          {RATINGS.map((value) => (
            <label key={value} className="cursor-pointer rounded-full p-1 has-focus-visible:outline-2">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="sr-only"
                aria-label={`${value} out of 5`}
              />
              <Star
                size={28}
                strokeWidth={1.5}
                fill={value <= rating ? "currentColor" : "none"}
                className={value <= rating ? "text-ink" : "text-faint"}
                aria-hidden
              />
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2 pt-4 text-sm leading-[18px] font-medium">
        Your review
        <textarea
          required
          maxLength={MAX_COMMENT}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What did you like? What should other guests know?"
          className="h-28 rounded-control border border-line bg-paper px-3 py-2 text-base leading-6 font-normal"
        />
      </label>
      {save.isError && (
        <p role="alert" className="pt-3 text-sm leading-[18px] text-action">
          {save.error instanceof ApiError && save.error.status === 409
            ? save.error.message
            : "Your review could not be posted. Try again."}
        </p>
      )}
      <Button
        type="submit"
        variant="dark"
        pending={save.isPending}
        disabled={rating === 0 || !comment.trim()}
        className="mt-4"
      >
        Post review
      </Button>
    </form>
  );
}
