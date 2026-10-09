"""Reading reviews (plan §10.7). Writing one is bonus B2 and is not built yet."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.bookings.models import Booking
from app.core.deps import ReadSession
from app.core.pagination import offset, total_pages
from app.listings import repository as listings
from app.listings.service import listing_not_found
from app.reviews.models import Review
from app.reviews.ratings import shown_average
from app.reviews.schemas import ReviewAuthor, ReviewOut, ReviewPage
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


ReviewServiceDep = Annotated[ReviewService, Depends(ReviewService)]
