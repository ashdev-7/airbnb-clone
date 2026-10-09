"""Builders for API tests: small, explicit data instead of the seed, so each test states
exactly what it depends on. Everything is written through the models in one write session."""

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.bookings.models import Booking
from app.bookings.pricing import calculate_price
from app.listings.models import Amenity, Listing, ListingAmenity, ListingImage, PropertyType
from app.reviews.models import Review
from app.users.models import User

TODAY = date(2026, 10, 9)
NOW = datetime(2026, 1, 1, tzinfo=UTC)
FEE_BPS = 1500
AMENITIES = (
    ("wifi", "Wifi", "internet_office"),
    ("kitchen", "Kitchen", "kitchen_dining"),
    ("pool", "Pool", "outdoor"),
)
PROPERTY_TYPES = (("villa", "Villa"), ("apartment", "Apartment"), ("cabin", "Cabin"))


class Factory:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.types = {t.slug: t for t in session.scalars(select(PropertyType))}
        self.amenities = {a.slug: a for a in session.scalars(select(Amenity))}
        if not self.types:  # first use on this database: add the reference data
            self.types = {s: PropertyType(slug=s, name=n) for s, n in PROPERTY_TYPES}
            self.amenities = {s: Amenity(slug=s, name=n, category=c) for s, n, c in AMENITIES}
            session.add_all([*self.types.values(), *self.amenities.values()])
            session.flush()
        self._count = session.scalar(select(func.count()).select_from(User)) or 0
        self._count += 100 * (session.scalar(select(func.count()).select_from(Listing)) or 0)

    def _next(self) -> int:
        self._count += 1
        return self._count

    def user(self, name: str = "Asha", is_demo: bool = True, **fields: Any) -> User:
        user = User(
            name=name,
            email=f"user{self._next()}@example.com",
            is_demo=is_demo,
            created_at=NOW,
            **fields,
        )
        self.session.add(user)
        self.session.flush()
        return user

    def listing(
        self,
        host: User,
        property_type: str = "villa",
        amenities: tuple[str, ...] = (),
        photos: int = 2,
        **fields: Any,
    ) -> Listing:
        number = self._next()
        values: dict[str, Any] = {
            "title": f"Listing {number}",
            "description": "A place to stay.",
            "city": "Jaipur",
            "state": "Rajasthan",
            "country": "India",
            "price_per_night_minor": 450_000,
            "cleaning_fee_minor": 120_000,
            "max_guests": 4,
            "bedrooms": 2,
            "beds": 2,
            "bathrooms": 1,
            "created_at": NOW,
            "updated_at": NOW,
        }
        listing = Listing(
            host_id=host.id, property_type_id=self.types[property_type].id, **(values | fields)
        )
        self.session.add(listing)
        self.session.flush()
        self.session.add_all(
            ListingImage(
                listing_id=listing.id, url=f"https://img.test/{number}-{n}.jpg", position=n
            )
            for n in range(photos)
        )
        self.session.add_all(
            ListingAmenity(listing_id=listing.id, amenity_id=self.amenities[slug].id)
            for slug in amenities
        )
        self.session.flush()
        return listing

    def booking(
        self, listing: Listing, guest: User, check_in: date, nights: int = 2, **fields: Any
    ) -> Booking:
        number = self._next()
        price = calculate_price(
            listing.price_per_night_minor, listing.cleaning_fee_minor, nights, FEE_BPS
        )
        booking = Booking(
            confirmation_code=f"CODE{number:06d}",
            listing_id=listing.id,
            guest_id=guest.id,
            check_in=check_in,
            check_out=check_in + timedelta(days=nights),
            adults=1,
            nightly_price_minor=price.nightly_price_minor,
            cleaning_fee_minor=price.cleaning_fee_minor,
            service_fee_minor=price.service_fee_minor,
            total_minor=price.total_minor,
            payment_reference="pay_test",
            idempotency_key=f"key-{number}",
            created_at=NOW,
            **fields,
        )
        self.session.add(booking)
        self.session.flush()
        return booking

    def review(
        self, listing: Listing, guest: User, rating: int = 5, days_ago: int | None = None
    ) -> Review:
        """A completed stay with its review. Each call uses dates that do not overlap."""
        number = self._next()
        check_in = TODAY - timedelta(days=days_ago if days_ago is not None else 10 + 3 * number)
        booking = self.booking(listing, guest, check_in, nights=2)
        review = Review(
            booking_id=booking.id,
            rating=rating,
            comment=f"Review {number}",
            created_at=NOW + timedelta(days=number),
        )
        self.session.add(review)
        self.session.flush()
        return review


def login(client: TestClient, user_id: int) -> None:
    response = client.post("/api/auth/login", json={"user_id": user_id})
    assert response.status_code == 200, response.text


def listing_body(**overrides: Any) -> dict[str, Any]:
    """A valid POST /api/listings body."""
    body: dict[str, Any] = {
        "title": "Sunlit villa with a pool",
        "description": "Bright rooms and a quiet garden.",
        "property_type": "villa",
        "city": "Udaipur",
        "state": "Rajasthan",
        "country": "India",
        "price_per_night_minor": 800_000,
        "cleaning_fee_minor": 100_000,
        "max_guests": 6,
        "bedrooms": 3,
        "beds": 4,
        "bathrooms": 2,
        "pets_allowed": True,
        "photos": ["https://img.test/a.jpg", "https://img.test/b.jpg"],
        "amenities": ["wifi", "pool"],
    }
    return body | overrides


def quote_total(client: TestClient, listing_id: int, check_in: date, check_out: date) -> int:
    """The total the guest would be shown, or 0 when no quote can be given."""
    response = client.get(
        f"/api/listings/{listing_id}/quote",
        params={"check_in": check_in.isoformat(), "check_out": check_out.isoformat()},
    )
    return int(response.json()["total_minor"]) if response.status_code == 200 else 0


def book(
    client: TestClient,
    listing: int,
    start: date,
    nights: int = 2,
    key: str | None = None,
    **overrides: Any,
) -> Any:
    """POST /api/bookings as the signed-in user, with the total a guest would have seen
    unless the test supplies another."""
    check_out = start + timedelta(days=nights)
    body: dict[str, Any] = {
        "listing_id": listing,
        "check_in": start.isoformat(),
        "check_out": check_out.isoformat(),
        "adults": 2,
        "payment_method": "demo_card_ok",
    }
    body |= overrides
    if "expected_total_minor" not in body:
        body["expected_total_minor"] = quote_total(client, listing, start, check_out)
    return client.post(
        "/api/bookings", json=body, headers={"Idempotency-Key": key or str(uuid.uuid4())}
    )
