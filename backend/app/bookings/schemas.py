from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.bookings.payment import PaymentMethod
from app.listings.schemas import CURRENCY

# Where a booking stands today. Derived from its dates and status, never stored.
Period = Literal["upcoming", "current", "past", "cancelled"]


class BookedRange(BaseModel):
    check_in: date
    check_out: date


class AvailabilityOut(BaseModel):
    """Confirmed stays that touch the window. It never says who booked."""

    listing_id: int
    start: date
    end: date
    booked: list[BookedRange]


class QuoteOut(BaseModel):
    """The price breakdown of plan §10.4. The frontend shows these lines; it never
    multiplies prices itself."""

    check_in: date
    check_out: date
    nights: int
    nightly_price_minor: int
    nights_total_minor: int
    cleaning_fee_minor: int
    service_fee_minor: int
    service_fee_bps: int
    total_minor: int
    currency: str = CURRENCY


class BookingCreate(BaseModel):
    """There is no guest id here: the guest is the signed-in user. `expected_total_minor`
    is the total the guest saw; it is compared with the server's, never charged."""

    model_config = ConfigDict(extra="forbid")

    listing_id: int
    check_in: date
    check_out: date
    adults: int
    children: int = 0
    infants: int = 0
    pets: int = 0
    payment_method: PaymentMethod
    expected_total_minor: int


class BookingListing(BaseModel):
    id: int
    title: str
    city: str
    state: str | None
    country: str
    cover_photo: str | None
    host_id: int
    host_name: str
    # True once the host has removed the listing: shown as "no longer available", unlinked.
    removed: bool


class BookingGuest(BaseModel):
    id: int
    name: str
    avatar_url: str | None


class BookingOut(BaseModel):
    id: int
    confirmation_code: str
    status: str
    period: Period
    check_in: date
    check_out: date
    nights: int
    adults: int
    children: int
    infants: int
    pets: int
    nightly_price_minor: int
    nights_total_minor: int
    cleaning_fee_minor: int
    service_fee_minor: int
    total_minor: int
    currency: str = CURRENCY
    created_at: datetime
    listing: BookingListing
    guest: BookingGuest


class BookingList(BaseModel):
    items: list[BookingOut]
