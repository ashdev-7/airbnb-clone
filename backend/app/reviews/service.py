"""Reviews (plan §10.7): reading those of a listing, reading your own, writing one after a stay."""

from collections.abc import Iterable
from datetime import date
from typing import Annotated

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.bookings.models import Booking
from app.core.clock import now_utc
from app.core.deps import ReadSession, Today, WriteSession
from app.core.errors import AppError
from app.core.pagination import offset, total_pages
from app.listings import repository as listings
from app.listings.models import Listing
from app.listings.service import listing_not_found
from app.reviews.models import Review
from app.reviews.ratings import shown_average
from app.reviews.rules import review_error
from app.reviews.schemas import (
    MyReview,
    ReviewAuthor,
    ReviewCreate,
    ReviewedListing,
    ReviewOut,
    ReviewPage,
)
from app.users.models import User


class ReviewService:
    def __init__(self, session: ReadSession) -> None:
        self._session: Session = session

    def for_listing(self, listing_id: int, page: int, page_size: int) -> ReviewPage:
        """A listing's reviews, newest first. The author is the guest of the reviewed stay."""
        if not listings.exists(self._session, listing_id):
            raise listing_not_found()

        of_listing = (
            select(Review.id)
            .join(Booking, Booking.id == Review.booking_id)
            .where(Booking.listing_id == listing_id)
        )
        total, average = self._session.execute(
            select(func.count(), func.avg(Review.rating)).where(Review.id.in_(of_listing))
        ).one()
        rows = self._session.execute(
            select(Review, User.name, User.avatar_url)
            .join(Booking, Booking.id == Review.booking_id)
            .join(User, User.id == Booking.guest_id)
            .where(Booking.listing_id == listing_id)
            .order_by(Review.created_at.desc(), Review.id.desc())
            .limit(page_size)
            .offset(offset(page, page_size))
        )
        return ReviewPage(
            items=[
                ReviewOut(
                    id=review.id,
                    rating=review.rating,
                    comment=review.comment,
                    created_at=review.created_at,
                    author=ReviewAuthor(name=name, avatar_url=avatar_url),
                )
                for review, name, avatar_url in rows
            ],
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages(total, page_size),
            rating_average=shown_average(average, total),
        )

    def written_by(self, user_id: int) -> list[MyReview]:
        """The reviews a user wrote, newest first, each with its listing."""
        rows = self._session.execute(
            select(Review, Listing)
            .join(Booking, Booking.id == Review.booking_id)
            .join(Listing, Listing.id == Booking.listing_id)
            .where(Booking.guest_id == user_id)
            .order_by(Review.created_at.desc(), Review.id.desc())
        )
        return [_my_review(review, listing) for review, listing in rows]


def by_booking(session: Session, booking_ids: Iterable[int]) -> dict[int, Review]:
    """The reviews of these stays, by booking id, in one statement."""
    reviews = session.scalars(select(Review).where(Review.booking_id.in_(list(booking_ids))))
    return {review.booking_id: review for review in reviews}


def _my_review(review: Review, listing: Listing) -> MyReview:
    return MyReview(
        id=review.id,
        booking_id=review.booking_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        listing=ReviewedListing(
            id=listing.id,
            title=listing.title,
            city=listing.city,
            removed=listing.deleted_at is not None,
        ),
    )


class ReviewWriter:
    """Writing a review (bonus B2), in the write session."""

    def __init__(self, session: WriteSession, today: Today) -> None:
        self._session: Session = session
        self._today: date = today

    def create(self, user_id: int, booking_id: int, body: ReviewCreate) -> MyReview:
        """Only the guest of the stay, only once it has ended and within the window, and
        once per stay. Someone else's booking answers 404, like reading it does."""
        row = self._session.execute(
            select(Booking, Listing)
            .join(Listing, Listing.id == Booking.listing_id)
            .where(Booking.id == booking_id)
        ).one_or_none()
        if row is None or row.Booking.guest_id != user_id:
            raise AppError("booking_not_found", 404, "This reservation does not exist.")
        problem = review_error(row.Booking, self._today)
        if problem:
            raise AppError(problem[0], 409, problem[1])
        if by_booking(self._session, [booking_id]):
            raise _already_reviewed()

        review = Review(
            booking_id=booking_id, rating=body.rating, comment=body.comment, created_at=now_utc()
        )
        self._session.add(review)
        try:
            self._session.flush()
        except IntegrityError as error:  # the unique index on booking_id has the last word
            raise _already_reviewed() from error
        return _my_review(review, row.Listing)


def _already_reviewed() -> AppError:
    return AppError("already_reviewed", 409, "You have already reviewed this stay.")


ReviewServiceDep = Annotated[ReviewService, Depends(ReviewService)]
ReviewWriterDep = Annotated[ReviewWriter, Depends(ReviewWriter)]
