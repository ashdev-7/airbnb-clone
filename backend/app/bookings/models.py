from datetime import date, datetime

from sqlalchemy import DDL, CheckConstraint, ForeignKey, Index, UniqueConstraint, event, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.bookings.availability import NO_OVERLAP_INSERT_TRIGGER, NO_OVERLAP_UPDATE_TRIGGER
from app.db.base import Base, UtcDateTime, integer_checks
from app.listings.models import Listing
from app.users.models import User

STATUS_CONFIRMED = "confirmed"
STATUS_CANCELLED = "cancelled"

# Nights as the database computes them, for the CHECK that keeps the money consistent.
_NIGHTS_SQL = "CAST(julianday(check_out) - julianday(check_in) AS INTEGER)"


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        # IS, not =: date() returns NULL for a malformed value, and a CHECK that
        # evaluates to NULL passes.
        CheckConstraint("check_in IS date(check_in)", name="check_in_iso_date"),
        CheckConstraint("check_out IS date(check_out)", name="check_out_iso_date"),
        CheckConstraint("check_out > check_in", name="check_out_after_check_in"),
        CheckConstraint("adults >= 1", name="adults_min"),
        CheckConstraint("children >= 0", name="children_not_negative"),
        CheckConstraint("infants >= 0", name="infants_not_negative"),
        CheckConstraint("pets >= 0", name="pets_not_negative"),
        CheckConstraint("nightly_price_minor > 0", name="nightly_price_positive"),
        CheckConstraint("cleaning_fee_minor >= 0", name="cleaning_fee_not_negative"),
        CheckConstraint("service_fee_minor >= 0", name="service_fee_not_negative"),
        CheckConstraint(
            f"total_minor = nightly_price_minor * {_NIGHTS_SQL}"
            " + cleaning_fee_minor + service_fee_minor",
            name="total_adds_up",
        ),
        *integer_checks(
            "adults",
            "children",
            "infants",
            "pets",
            "nightly_price_minor",
            "cleaning_fee_minor",
            "service_fee_minor",
            "total_minor",
        ),
        CheckConstraint(
            f"status IN ('{STATUS_CONFIRMED}', '{STATUS_CANCELLED}')", name="status_known"
        ),
        UniqueConstraint("guest_id", "idempotency_key"),
        # Serves the overlap check, the availability calendar and search by dates.
        Index(
            "ix_bookings_listing_id_check_in_check_out_confirmed",
            "listing_id",
            "check_in",
            "check_out",
            sqlite_where=text(f"status = '{STATUS_CONFIRMED}'"),
        ),
        Index("ix_bookings_guest_id_check_in", "guest_id", "check_in"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    confirmation_code: Mapped[str] = mapped_column(unique=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="RESTRICT"))
    guest_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    check_in: Mapped[date]
    check_out: Mapped[date]
    adults: Mapped[int]
    children: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    infants: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    pets: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    # What was charged: a historical fact, not a copy of the listing's current price.
    nightly_price_minor: Mapped[int]
    cleaning_fee_minor: Mapped[int]
    service_fee_minor: Mapped[int]
    total_minor: Mapped[int]
    status: Mapped[str] = mapped_column(
        default=STATUS_CONFIRMED, server_default=text(f"'{STATUS_CONFIRMED}'")
    )
    payment_reference: Mapped[str]
    idempotency_key: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)

    listing: Mapped[Listing] = relationship()
    guest: Mapped[User] = relationship()


# Created together with the table, so every database built from the models has them.
for _trigger in (NO_OVERLAP_INSERT_TRIGGER, NO_OVERLAP_UPDATE_TRIGGER):
    event.listen(Booking.__table__, "after_create", DDL(_trigger))  # type: ignore[no-untyped-call]
