from typing import Annotated

from fastapi import APIRouter, Query

from app.reviews.schemas import (
    MAX_REVIEWS_PAGE_SIZE,
    REVIEWS_PAGE_SIZE,
    MyReview,
    MyReviews,
    ReviewCreate,
    ReviewPage,
)
from app.reviews.service import ReviewServiceDep, ReviewWriterDep
from app.users.deps import RequireUser

router = APIRouter(tags=["reviews"])


@router.get("/listings/{listing_id}/reviews", response_model=ReviewPage)
def listing_reviews(
    listing_id: int,
    service: ReviewServiceDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_REVIEWS_PAGE_SIZE)] = REVIEWS_PAGE_SIZE,
) -> ReviewPage:
    return service.for_listing(listing_id, page, page_size)


@router.get("/reviews/mine", response_model=MyReviews)
def my_reviews(user: RequireUser, service: ReviewServiceDep) -> MyReviews:
    """The reviews the signed-in user has written (the profile page, plan §6.15)."""
    return MyReviews(items=service.written_by(user.id))


@router.post("/bookings/{booking_id}/review", response_model=MyReview, status_code=201)
def review_stay(
    booking_id: int, body: ReviewCreate, user: RequireUser, service: ReviewWriterDep
) -> MyReview:
    return service.create(user.id, booking_id, body)
