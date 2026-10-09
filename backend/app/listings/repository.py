"""Listing queries (plan §10.6). Every query here starts from `ACTIVE`, the one place
that hides removed listings, and a page of cards always costs the same three statements:
a count, the page itself and its photos."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import ColumnElement, Row, Select, func, or_, select
from sqlalchemy.orm import Session

from app.bookings.availability import overlap_condition
from app.bookings.models import STATUS_CONFIRMED, Booking
from app.listings.models import Amenity, Listing, ListingAmenity, ListingImage, PropertyType
from app.reviews.ratings import rating_summary
from app.wishlist.models import WishlistItem

ACTIVE = Listing.deleted_at.is_(None)
CARD_PHOTOS = 5
_LIKE_ESCAPE = "\\"


@dataclass(frozen=True)
class ListingFilters:
    location: str | None = None
    guests: int = 0  # adults + children
    pets: int = 0
    min_price_minor: int | None = None
    max_price_minor: int | None = None
    property_types: tuple[str, ...] = ()
    amenities: tuple[str, ...] = ()
    min_bedrooms: int = 0
    min_beds: int = 0
    min_bathrooms: int = 0
    check_in: date | None = None
    check_out: date | None = None


def _contains(text: str) -> str:
    """A LIKE pattern matching `text` anywhere, with the wildcard characters made literal."""
    escaped = text
    for special in (_LIKE_ESCAPE, "%", "_"):
        escaped = escaped.replace(special, _LIKE_ESCAPE + special)
    return f"%{escaped}%"


def _place_matches(text: str) -> ColumnElement[bool]:
    pattern = _contains(text)
    return or_(
        Listing.city.ilike(pattern, escape=_LIKE_ESCAPE),
        Listing.state.ilike(pattern, escape=_LIKE_ESCAPE),
        Listing.country.ilike(pattern, escape=_LIKE_ESCAPE),
    )


def _conditions(filters: ListingFilters, *, with_price: bool = True) -> list[ColumnElement[bool]]:
    """Filter groups combine with AND (plan §10.6)."""
    conditions: list[ColumnElement[bool]] = [ACTIVE]
    # "Candolim, Goa": each comma-separated part must match the city, state or country.
    for part in (filters.location or "").split(","):
        if part.strip():
            conditions.append(_place_matches(part.strip()))
    if filters.guests:
        conditions.append(Listing.max_guests >= filters.guests)
    if filters.pets:
        conditions.append(Listing.pets_allowed.is_(True))
    if with_price and filters.min_price_minor is not None:
        conditions.append(Listing.price_per_night_minor >= filters.min_price_minor)
    if with_price and filters.max_price_minor is not None:
        conditions.append(Listing.price_per_night_minor <= filters.max_price_minor)
    if filters.property_types:  # any of
        conditions.append(
            Listing.property_type_id.in_(
                select(PropertyType.id).where(PropertyType.slug.in_(filters.property_types))
            )
        )
    if filters.amenities:  # all of
        wanted = set(filters.amenities)
        conditions.append(
            Listing.id.in_(
                select(ListingAmenity.listing_id)
                .join(Amenity, Amenity.id == ListingAmenity.amenity_id)
                .where(Amenity.slug.in_(wanted))
                .group_by(ListingAmenity.listing_id)
                .having(func.count() == len(wanted))
            )
        )
    if filters.check_in and filters.check_out:
        # Free for the whole stay: no confirmed booking overlaps it.
        conditions.append(
            ~select(Booking.id)
            .where(
                Booking.listing_id == Listing.id,
                Booking.status == STATUS_CONFIRMED,
                overlap_condition(
                    Booking.check_in, Booking.check_out, filters.check_in, filters.check_out
                ),
            )
            .exists()
        )
    conditions.append(Listing.bedrooms >= filters.min_bedrooms)
    conditions.append(Listing.beds >= filters.min_beds)
    conditions.append(Listing.bathrooms >= filters.min_bathrooms)
    return conditions


def _cards() -> Select[Any]:
    """A listing with its property type and rating summary, in one statement."""
    ratings = rating_summary()
    return (
        select(
            Listing,
            PropertyType.slug.label("type_slug"),
            PropertyType.name.label("type_name"),
            ratings.c.average,
            func.coalesce(ratings.c.review_count, 0).label("review_count"),
        )
        .join(PropertyType, PropertyType.id == Listing.property_type_id)
        .outerjoin(ratings, ratings.c.listing_id == Listing.id)
    )


def count(session: Session, filters: ListingFilters) -> int:
    return session.execute(
        select(func.count()).select_from(Listing).where(*_conditions(filters))
    ).scalar_one()


def search(
    session: Session, filters: ListingFilters, limit: int, offset: int
) -> Sequence[Row[Any]]:
    """Newest first. The order is total (ids are unique), so pages never overlap or skip."""
    return session.execute(
        _cards()
        .where(*_conditions(filters))
        .order_by(Listing.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()


def by_host(session: Session, host_id: int) -> Sequence[Row[Any]]:
    return session.execute(
        _cards().where(ACTIVE, Listing.host_id == host_id).order_by(Listing.id.desc())
    ).all()


def saved_by(session: Session, user_id: int) -> Sequence[Row[Any]]:
    """A user's saved listings, most recently saved first."""
    return session.execute(
        _cards()
        .join(WishlistItem, WishlistItem.listing_id == Listing.id)
        .where(ACTIVE, WishlistItem.user_id == user_id)
        .order_by(WishlistItem.created_at.desc(), Listing.id.desc())
    ).all()


def one(session: Session, listing_id: int) -> Row[Any] | None:
    return session.execute(_cards().where(ACTIVE, Listing.id == listing_id)).one_or_none()


def get(session: Session, listing_id: int) -> Listing | None:
    """The listing itself, unless it is unknown or removed."""
    return session.scalars(select(Listing).where(ACTIVE, Listing.id == listing_id)).one_or_none()


def exists(session: Session, listing_id: int) -> bool:
    found = session.execute(select(Listing.id).where(ACTIVE, Listing.id == listing_id))
    return found.first() is not None


def photos(
    session: Session, listing_ids: Sequence[int], per_listing: int | None = CARD_PHOTOS
) -> dict[int, list[str]]:
    """Photo URLs for many listings in one statement, cover first."""
    result: dict[int, list[str]] = {listing_id: [] for listing_id in listing_ids}
    if not listing_ids:
        return result
    statement = (
        select(ListingImage.listing_id, ListingImage.url)
        .where(ListingImage.listing_id.in_(listing_ids))
        .order_by(ListingImage.listing_id, ListingImage.position)
    )
    if per_listing is not None:
        statement = statement.where(ListingImage.position < per_listing)
    for listing_id, url in session.execute(statement):
        result[listing_id].append(url)
    return result


def amenities_of(session: Session, listing_id: int) -> Sequence[Amenity]:
    return session.scalars(
        select(Amenity)
        .join(ListingAmenity, ListingAmenity.amenity_id == Amenity.id)
        .where(ListingAmenity.listing_id == listing_id)
        .order_by(Amenity.id)
    ).all()


def active_listing_count(session: Session, host_id: int) -> int:
    return session.execute(
        select(func.count()).select_from(Listing).where(ACTIVE, Listing.host_id == host_id)
    ).scalar_one()


def prices(session: Session, filters: ListingFilters) -> Sequence[int]:
    """Nightly prices of the listings matching every filter except the price bounds."""
    return session.scalars(
        select(Listing.price_per_night_minor).where(*_conditions(filters, with_price=False))
    ).all()


def _name_starts_with(column: Any, text: str) -> ColumnElement[bool]:
    """True when `text` is the beginning of the name or of one of its words."""
    prefix = _contains(text)[1:]  # escaped, without the leading wildcard
    return or_(
        column.ilike(prefix, escape=_LIKE_ESCAPE),
        column.ilike(f"% {prefix}", escape=_LIKE_ESCAPE),
    )


def places(session: Session, query: str) -> list[tuple[str | None, str | None, str, int]]:
    """Suggestions for the Where panel as (city, state, country, listing count).

    Each suggestion is matched on its own name: a city on the city, a state on the state
    (city is then None), a country on the country (city and state are None). So "ma"
    offers Manali and Maharashtra, but not Mumbai merely because it is in Maharashtra.
    Without a query, the busiest cities are offered.
    """
    listing_count = func.count().label("listing_count")
    text = query.strip()

    def grouped(*columns: Any) -> Select[Any]:
        return select(*columns, listing_count).where(ACTIVE).group_by(*columns)

    cities = grouped(Listing.city, Listing.state, Listing.country)
    if not text:
        return [(c, s, n, k) for c, s, n, k in session.execute(cities)]

    found: list[tuple[str | None, str | None, str, int]] = [
        (c, s, n, k)
        for c, s, n, k in session.execute(cities.where(_name_starts_with(Listing.city, text)))
    ]
    states = grouped(Listing.state, Listing.country).where(
        Listing.state.is_not(None), _name_starts_with(Listing.state, text)
    )
    found += [(None, s, n, k) for s, n, k in session.execute(states)]
    countries = grouped(Listing.country).where(_name_starts_with(Listing.country, text))
    found += [(None, None, n, k) for n, k in session.execute(countries)]
    return found
