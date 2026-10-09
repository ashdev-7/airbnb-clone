"""Rating aggregation (plan §10.7). Nothing is stored: averages are computed when read."""

from datetime import date

from sqlalchemy import Subquery, func, select
from sqlalchemy.orm import Session

from app.bookings.models import STATUS_CONFIRMED, Booking
from app.listings.models import Listing
from app.reviews.models import Review

# A listing's rating is shown once it has three reviews (REF-R1); before that it is "New".
MIN_REVIEWS_FOR_RATING = 3
# Badges (bonus B3), derived when read. "Guest favourite": at least five reviews (REF-R2);
# the average is ours, as none is published. "Superhost": at least 10 completed stays and
# an overall rating of 4.8 or higher (REF-R3); response and cancellation rates are not modelled.
GUEST_FAVOURITE_MIN_REVIEWS = 5
GUEST_FAVOURITE_MIN_AVERAGE = 4.9
SUPERHOST_MIN_STAYS = 10
SUPERHOST_MIN_AVERAGE = 4.8


def rating_summary() -> Subquery:
    """One row per reviewed listing: `listing_id`, `average`, `review_count`."""
    return (
        select(
            Booking.listing_id.label("listing_id"),
            func.avg(Review.rating).label("average"),
            func.count(Review.id).label("review_count"),
        )
        .join(Booking, Booking.id == Review.booking_id)
        .group_by(Booking.listing_id)
        .subquery("ratings")
    )


def shown_average(average: float | None, review_count: int) -> float | None:
    """The average to two decimals, or None while the listing has too few reviews."""
    if average is None or review_count < MIN_REVIEWS_FOR_RATING:
        return None
    return round(float(average), 2)


def is_guest_favourite(average: float | None, review_count: int) -> bool:
    return (
        average is not None
        and review_count >= GUEST_FAVOURITE_MIN_REVIEWS
        and float(average) >= GUEST_FAVOURITE_MIN_AVERAGE
    )


def is_superhost(session: Session, host_id: int, today: date) -> bool:
    """Completed stays and the average of every review, across all the host's listings
    (removed ones included: they are part of the host's record). Two small statements."""
    hosted = Booking.listing_id.in_(select(Listing.id).where(Listing.host_id == host_id))
    stays = session.scalar(
        select(func.count())
        .select_from(Booking)
        .where(hosted, Booking.status == STATUS_CONFIRMED, Booking.check_out <= today)
    )
    average = session.scalar(
        select(func.avg(Review.rating)).join(Booking, Booking.id == Review.booking_id).where(hosted)
    )
    return (
        (stays or 0) >= SUPERHOST_MIN_STAYS
        and average is not None
        and float(average) >= SUPERHOST_MIN_AVERAGE
    )
