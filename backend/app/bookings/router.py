from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Query, Response

from app.bookings.schemas import (
    AvailabilityOut,
    BookingCreate,
    BookingList,
    BookingOut,
    Period,
    QuoteOut,
)
from app.bookings.service import BookingReader, BookingWriter
from app.users.deps import RequireUser

router = APIRouter(tags=["bookings"])

# --- anyone ------------------------------------------------------------------------------


@router.get("/listings/{listing_id}/availability", response_model=AvailabilityOut)
def availability(
    listing_id: int,
    service: BookingReader,
    start: Annotated[date | None, Query(alias="from")] = None,
    end: Annotated[date | None, Query(alias="to")] = None,
) -> AvailabilityOut:
    return service.availability(listing_id, start, end)


@router.get("/listings/{listing_id}/quote", response_model=QuoteOut)
def quote(
    listing_id: int,
    service: BookingReader,
    check_in: date,
    check_out: date,
    adults: int = 1,
    children: int = 0,
    infants: int = 0,
    pets: int = 0,
) -> QuoteOut:
    return service.quote(listing_id, check_in, check_out, adults, children, infants, pets)


# --- the signed-in user ------------------------------------------------------------------


@router.post("/bookings", response_model=BookingOut, status_code=201)
def create_booking(
    body: BookingCreate,
    idempotency_key: Annotated[UUID, Header()],
    response: Response,
    user: RequireUser,
    service: BookingWriter,
) -> BookingOut:
    """201 for a new booking; 200 when the same Idempotency-Key already made it."""
    booking, created = service.create(user.id, str(idempotency_key), body)
    if not created:
        response.status_code = 200
    return booking


@router.get("/bookings", response_model=BookingList)
def my_trips(user: RequireUser, service: BookingReader) -> BookingList:
    return BookingList(items=service.trips(user.id))


@router.get("/bookings/{booking_id}", response_model=BookingOut)
def booking_detail(booking_id: int, user: RequireUser, service: BookingReader) -> BookingOut:
    return service.detail(user.id, booking_id)


@router.get("/hosting/reservations", response_model=BookingList)
def my_reservations(
    user: RequireUser,
    service: BookingReader,
    status: Period | None = None,
    listing_id: int | None = None,
) -> BookingList:
    return BookingList(items=service.reservations(user.id, status, listing_id))
