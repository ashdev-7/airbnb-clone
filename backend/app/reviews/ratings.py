"""Rating aggregation (plan §10.7). Nothing is stored: averages are computed when read."""

from sqlalchemy import Subquery, func, select

from app.bookings.models import Booking
from app.reviews.models import Review

# A listing's rating is shown once it has three reviews (REF-R1); before that it is "New".
MIN_REVIEWS_FOR_RATING = 3


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
