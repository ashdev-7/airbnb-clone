"""Availability, quotes and bookings (plan §10.2–§10.4).

`create` follows the thirteen steps of plan §10.3 in order and logs each one. It runs in
the write session, so the availability check, the price and the insert happen with
SQLite's single write lock held: two guests cannot both see "free" and both book.
"""

import logging
import secrets
from collections.abc import Sequence
from datetime import date
from typing import Annotated

from fastapi import Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.bookings import repository
from app.bookings.availability import OVERLAP_ERROR, last_bookable_day, stay_error
from app.bookings.guests import party_error
from app.bookings.models import STATUS_CANCELLED, Booking
from app.bookings.payment import PaymentDeclined, PaymentGateway, get_payment_gateway
from app.bookings.pricing import PriceBreakdown, calculate_price
from app.bookings.repository import BookingRow
from app.bookings.schemas import (
    AvailabilityOut,
    BookedRange,
    BookingCreate,
    BookingGuest,
    BookingListing,
    BookingOut,
    BookingReview,
    Period,
    QuoteOut,
)
from app.core.clock import now_utc
from app.core.deps import AppSettings, ReadSession, Today, WriteSession
from app.core.errors import AppError
from app.listings import repository as listings
from app.listings.models import Listing
from app.listings.service import listing_not_found
from app.reviews import service as reviews
from app.reviews.models import Review
from app.reviews.rules import review_error

logger = logging.getLogger("app.bookings")
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I
_CODE_LENGTH = 10


def period_of(booking: Booking, today: date) -> Period:
    if booking.status == STATUS_CANCELLED:
        return "cancelled"
    if booking.check_out <= today:
        return "past"
    return "current" if booking.check_in <= today else "upcoming"


def dates_unavailable() -> AppError:
    return AppError("dates_unavailable", 409, "Those dates are no longer available.")


class BookingService:
    def __init__(
        self, session: Session, today: date, service_fee_bps: int, gateway: PaymentGateway
    ) -> None:
        self._session = session
        self._today = today
        self._fee_bps = service_fee_bps
        self._gateway = gateway

    # --- availability and quote -----------------------------------------------------------

    def availability(
        self, listing_id: int, start: date | None, end: date | None
    ) -> AvailabilityOut:
        """Booked ranges in a window; by default the whole bookable window."""
        start = start or self._today
        end = end or last_bookable_day(self._today)
        if end <= start:
            raise AppError("invalid_dates", 422, "The window must end after it starts.")
        if not listings.exists(self._session, listing_id):
            raise listing_not_found()
        ranges = repository.booked_ranges(self._session, listing_id, start, end)
        return AvailabilityOut(
            listing_id=listing_id,
            start=start,
            end=end,
            booked=[
                BookedRange(check_in=check_in, check_out=check_out)
                for check_in, check_out in ranges
            ],
        )

    def quote(
        self,
        listing_id: int,
        check_in: date,
        check_out: date,
        adults: int,
        children: int,
        infants: int,
        pets: int,
    ) -> QuoteOut:
        listing = self._listing(listing_id)
        price = self._price(listing, check_in, check_out, adults, children, infants, pets)
        return self._quote(check_in, check_out, price)

    def _listing(self, listing_id: int) -> Listing:
        listing = listings.get(self._session, listing_id)
        if listing is None:
            raise listing_not_found()
        return listing

    def _price(
        self,
        listing: Listing,
        check_in: date,
        check_out: date,
        adults: int,
        children: int,
        infants: int,
        pets: int,
    ) -> PriceBreakdown:
        """Steps 7–10 of plan §10.3, shared by the quote and the booking: valid dates,
        valid guests, no overlap, then the price."""
        problem = stay_error(check_in, check_out, self._today)
        if problem:
            raise AppError("invalid_dates", 422, problem)
        problem = party_error(
            adults, children, infants, pets, listing.max_guests, listing.pets_allowed
        )
        if problem:
            raise AppError("invalid_guest_count", 422, problem)
        if repository.has_conflict(self._session, listing.id, check_in, check_out):
            raise dates_unavailable()
        return calculate_price(
            listing.price_per_night_minor,
            listing.cleaning_fee_minor,
            (check_out - check_in).days,
            self._fee_bps,
        )

    def _quote(self, check_in: date, check_out: date, price: PriceBreakdown) -> QuoteOut:
        return QuoteOut(
            check_in=check_in,
            check_out=check_out,
            nights=price.nights,
            nightly_price_minor=price.nightly_price_minor,
            nights_total_minor=price.nights_total_minor,
            cleaning_fee_minor=price.cleaning_fee_minor,
            service_fee_minor=price.service_fee_minor,
            service_fee_bps=self._fee_bps,
            total_minor=price.total_minor,
        )

    # --- creating a booking ---------------------------------------------------------------

    def create(self, guest_id: int, key: str, body: BookingCreate) -> tuple[BookingOut, bool]:
        """Returns the booking and whether it was created now (False: an earlier request
        with the same idempotency key already made it). Steps 1–3 happened on the way in:
        the session user, the request's shape, and BEGIN IMMEDIATE."""
        stay = f"guest={guest_id} listing={body.listing_id} {body.check_in}..{body.check_out}"
        logger.info("booking step 3: write transaction open, %s", stay)

        # 4. The same key again: answer with the first booking, or refuse a different request.
        existing = repository.by_idempotency_key(self._session, guest_id, key)
        if existing is not None:
            if not _same_request(existing, body):
                logger.info("booking step 4: idempotency key reused for a different request")
                raise AppError(
                    "idempotency_key_reused",
                    422,
                    "This idempotency key was already used for a different booking.",
                )
            logger.info("booking step 4: replay, returning booking %s", existing.id)
            return self._out(existing.id), False
        logger.info("booking step 4: new idempotency key")

        # 5. The listing exists and is not removed.
        listing = self._listing(body.listing_id)
        logger.info("booking step 5: listing found")

        # 6. A host cannot book their own place.
        if listing.host_id == guest_id:
            logger.info("booking step 6: refused, guest is the host")
            raise AppError("cannot_book_own_listing", 403, "You cannot book your own listing.")
        logger.info("booking step 6: guest is not the host")

        # 7–9. Dates, guests and availability; then the price, computed here and nowhere else.
        price = self._price(
            listing,
            body.check_in,
            body.check_out,
            body.adults,
            body.children,
            body.infants,
            body.pets,
        )
        logger.info("booking steps 7-9: dates, guests and availability ok")

        # 10. The guest must have seen this total. Their number is compared, never charged.
        if price.total_minor != body.expected_total_minor:
            logger.info(
                "booking step 10: price changed, expected=%s actual=%s",
                body.expected_total_minor,
                price.total_minor,
            )
            raise AppError(
                "price_changed",
                409,
                "The price has changed. Please review the new total.",
                {
                    "quote": self._quote(body.check_in, body.check_out, price).model_dump(
                        mode="json"
                    )
                },
            )
        logger.info("booking step 10: total %s matches", price.total_minor)

        # 11. Charge. The lock is held meanwhile, which is right only because the mock is
        # instant; a real gateway would need a short-lived hold on the dates instead.
        try:
            reference = self._gateway.charge(price.total_minor, body.payment_method)
        except PaymentDeclined:
            logger.info("booking step 11: payment declined")
            raise AppError("payment_declined", 402, "Your payment was declined.") from None
        logger.info("booking step 11: payment approved")

        # 12. Insert with the price snapshot. The trigger is the last line of defence.
        booking = Booking(
            confirmation_code=self._new_code(),
            listing_id=listing.id,
            guest_id=guest_id,
            check_in=body.check_in,
            check_out=body.check_out,
            adults=body.adults,
            children=body.children,
            infants=body.infants,
            pets=body.pets,
            nightly_price_minor=price.nightly_price_minor,
            cleaning_fee_minor=price.cleaning_fee_minor,
            service_fee_minor=price.service_fee_minor,
            total_minor=price.total_minor,
            payment_reference=reference,
            idempotency_key=key,
            created_at=now_utc(),
        )
        self._session.add(booking)
        try:
            self._session.flush()
        except IntegrityError as error:
            if OVERLAP_ERROR in str(error.orig):
                raise dates_unavailable() from error
            raise
        logger.info("booking step 12: booking %s inserted", booking.id)
        return self._out(booking.id), True

    def _new_code(self) -> str:
        while True:
            code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))
            if not repository.code_taken(self._session, code):
                return code

    # --- reading bookings -----------------------------------------------------------------

    def trips(self, guest_id: int) -> list[BookingOut]:
        return self._outs(repository.trips(self._session, guest_id))

    def reservations(
        self, host_id: int, period: Period | None, listing_id: int | None
    ) -> list[BookingOut]:
        rows = repository.reservations(self._session, host_id, self._today, period, listing_id)
        return self._outs(rows)

    def detail(self, user_id: int, booking_id: int) -> BookingOut:
        """Visible to its guest and to the listing's host; 404 to anyone else, so the
        answer does not reveal whether the booking exists."""
        row = repository.one(self._session, booking_id)
        if row is None or user_id not in (row.Booking.guest_id, row.Listing.host_id):
            raise AppError("booking_not_found", 404, "This reservation does not exist.")
        return self._outs([row])[0]

    def _out(self, booking_id: int) -> BookingOut:
        row = repository.one(self._session, booking_id)
        assert row is not None
        return self._outs([row])[0]

    def _outs(self, rows: Sequence[BookingRow]) -> list[BookingOut]:
        """Bookings with one further statement for all their cover photos, and one for
        all their reviews."""
        covers = listings.photos(self._session, [row.Listing.id for row in rows], per_listing=1)
        written = reviews.by_booking(self._session, [row.Booking.id for row in rows])
        return [
            self._to_out(row, covers[row.Listing.id], written.get(row.Booking.id)) for row in rows
        ]

    def _to_out(self, row: BookingRow, cover: list[str], review: Review | None) -> BookingOut:
        booking, listing, guest, host = row.Booking, row.Listing, row.guest, row.host
        nights = (booking.check_out - booking.check_in).days
        return BookingOut(
            id=booking.id,
            confirmation_code=booking.confirmation_code,
            status=booking.status,
            period=period_of(booking, self._today),
            check_in=booking.check_in,
            check_out=booking.check_out,
            nights=nights,
            adults=booking.adults,
            children=booking.children,
            infants=booking.infants,
            pets=booking.pets,
            nightly_price_minor=booking.nightly_price_minor,
            nights_total_minor=booking.nightly_price_minor * nights,
            cleaning_fee_minor=booking.cleaning_fee_minor,
            service_fee_minor=booking.service_fee_minor,
            total_minor=booking.total_minor,
            created_at=booking.created_at,
            listing=BookingListing(
                id=listing.id,
                title=listing.title,
                city=listing.city,
                state=listing.state,
                country=listing.country,
                cover_photo=cover[0] if cover else None,
                host_id=host.id,
                host_name=host.name,
                removed=listing.deleted_at is not None,
            ),
            guest=BookingGuest(id=guest.id, name=guest.name, avatar_url=guest.avatar_url),
            review=(
                BookingReview(
                    rating=review.rating, comment=review.comment, created_at=review.created_at
                )
                if review
                else None
            ),
            can_review=review is None and review_error(booking, self._today) is None,
        )


def _same_request(booking: Booking, body: BookingCreate) -> bool:
    """Whether a stored booking is the one this request asks for (plan §10.3 step 4)."""
    return (
        booking.listing_id,
        booking.check_in,
        booking.check_out,
        booking.adults,
        booking.children,
        booking.infants,
        booking.pets,
        booking.total_minor,
    ) == (
        body.listing_id,
        body.check_in,
        body.check_out,
        body.adults,
        body.children,
        body.infants,
        body.pets,
        body.expected_total_minor,
    )


Gateway = Annotated[PaymentGateway, Depends(get_payment_gateway)]


def _reader(
    session: ReadSession, today: Today, settings: AppSettings, gateway: Gateway
) -> BookingService:
    return BookingService(session, today, settings.service_fee_bps, gateway)


def _writer(
    session: WriteSession, today: Today, settings: AppSettings, gateway: Gateway
) -> BookingService:
    """Every mutating request runs in the write session (BEGIN IMMEDIATE)."""
    return BookingService(session, today, settings.service_fee_bps, gateway)


BookingReader = Annotated[BookingService, Depends(_reader)]
BookingWriter = Annotated[BookingService, Depends(_writer)]
