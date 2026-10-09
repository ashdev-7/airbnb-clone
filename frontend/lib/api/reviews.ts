import type { MyReview, ReviewRequest } from "@/types/booking";
import { api } from "./client";

/** Reviews a completed stay. The author is the signed-in user, never sent. */
export const writeReview = (bookingId: number, body: ReviewRequest) =>
  api<MyReview>(`/bookings/${bookingId}/review`, { method: "POST", body });

/** The reviews the signed-in user has written, newest first. */
export const getMyReviews = () => api<{ items: MyReview[] }>("/reviews/mine");
