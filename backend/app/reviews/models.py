from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.bookings.models import Booking
from app.db.base import Base, UtcDateTime, integer_checks


class Review(Base):
    """One review per stay. The listing and the author are reached through the booking,
    so a review cannot exist without a stay and cannot disagree with it."""

    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),
        *integer_checks("rating"),
        CheckConstraint("length(trim(comment)) > 0", name="comment_not_empty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="RESTRICT"), unique=True
    )
    rating: Mapped[int]
    comment: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)

    booking: Mapped[Booking] = relationship()
