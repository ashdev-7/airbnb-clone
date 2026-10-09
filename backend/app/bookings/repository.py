"""Booking queries. The overlap test always comes from `availability.overlap_condition`."""

from collections.abc import Sequence
from datetime import date

from sqlalchemy import ColumnElement, Row, Select, select
from sqlalchemy.orm import Session, aliased

from app.bookings.availability import overlap_condition
from app.bookings.models import STATUS_CANCELLED, STATUS_CONFIRMED, Booking
from app.listings.models import Listing
from app.users.models import User

CONFIRMED = Booking.status == STATUS_CONFIRMED
_Guest = aliased(User, name="guest")
_Host = aliased(User, name="host")
# A booking with its listing, its guest and the listing's host.
BookingRow = Row[Booking, Listing, User, User]


def _blocks(listing_id: int, check_in: date, check_out: date) -> list[ColumnElement[bool]]:
    """Confirmed bookings of a listing that overlap [check_in, check_out)."""
    return [
        Booking.listing_id == listing_id,
        CONFIRMED,
        overlap_condition(Booking.check_in, Booking.check_out, check_in, check_out),
    ]


def has_conflict(session: Session, listing_id: int, check_in: date, check_out: date) -> bool:
    found = session.execute(select(Booking.id).where(*_blocks(listing_id, check_in, check_out)))
    return found.first() is not None


def booked_ranges(
    session: Session, listing_id: int, start: date, end: date
) -> Sequence[Row[date, date]]:
    return session.execute(
        select(Booking.check_in, Booking.check_out)
        .where(*_blocks(listing_id, start, end))
        .order_by(Booking.check_in)
    ).all()


def by_idempotency_key(session: Session, guest_id: int, key: str) -> Booking | None:
    return session.scalars(
        select(Booking).where(Booking.guest_id == guest_id, Booking.idempotency_key == key)
    ).one_or_none()


def code_taken(session: Session, code: str) -> bool:
    found = session.execute(select(Booking.id).where(Booking.confirmation_code == code))
    return found.first() is not None


def period_condition(period: str, today: date) -> ColumnElement[bool]:
    """The SQL form of `service.period_of`."""
    if period == "cancelled":
        return Booking.status == STATUS_CANCELLED
    dates = {
        "past": Booking.check_out <= today,
        "current": (Booking.check_in <= today) & (Booking.check_out > today),
        "upcoming": Booking.check_in > today,
    }[period]
    return CONFIRMED & dates


def _detailed() -> Select[Booking, Listing, User, User]:
    """A booking with its listing (removed or not), its guest and the listing's host."""
    return (
        select(Booking, Listing, _Guest, _Host)
        .join(Listing, Listing.id == Booking.listing_id)
        .join(_Guest, _Guest.id == Booking.guest_id)
        .join(_Host, _Host.id == Listing.host_id)
    )


def one(session: Session, booking_id: int) -> BookingRow | None:
    return session.execute(_detailed().where(Booking.id == booking_id)).one_or_none()


def trips(session: Session, guest_id: int) -> Sequence[BookingRow]:
    """A guest's bookings, latest check-in first."""
    return session.execute(
        _detailed()
        .where(Booking.guest_id == guest_id)
        .order_by(Booking.check_in.desc(), Booking.id.desc())
    ).all()


def reservations(
    session: Session, host_id: int, today: date, period: str | None, listing_id: int | None
) -> Sequence[BookingRow]:
    """Bookings on a host's listings, soonest check-in first. Listings the host has since
    removed are included: their reservations are still the host's history."""
    statement = _detailed().where(Listing.host_id == host_id)
    if period is not None:
        statement = statement.where(period_condition(period, today))
    if listing_id is not None:
        statement = statement.where(Listing.id == listing_id)
    return session.execute(statement.order_by(Booking.check_in, Booking.id)).all()
