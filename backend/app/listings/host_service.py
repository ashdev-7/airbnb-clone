"""A host's own listings: create, update, remove (plan §10.5).

Ownership always comes from the session user passed in by the router; nothing here reads
a host id from a request body.
"""

from datetime import date
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy import delete, exists, select
from sqlalchemy.orm import Session

from app.bookings.models import STATUS_CONFIRMED, Booking
from app.core.clock import now_utc
from app.core.deps import ReadSession, Today, WriteSession
from app.core.errors import AppError, invalid_field
from app.listings import repository
from app.listings.models import Amenity, Listing, ListingAmenity, ListingImage, PropertyType
from app.listings.schemas import ListingCard, ListingCreate, ListingDetail, ListingUpdate
from app.listings.service import listing_not_found, to_cards, to_detail
from app.wishlist.models import WishlistItem

# Columns that are copied straight from the request onto the listing.
_PLAIN_FIELDS = (
    "title",
    "description",
    "city",
    "state",
    "country",
    "price_per_night_minor",
    "cleaning_fee_minor",
    "max_guests",
    "bedrooms",
    "beds",
    "bathrooms",
    "pets_allowed",
)


class HostListingService:
    def __init__(self, session: Session, today: date) -> None:
        self._session = session
        self._today = today

    # --- reading --------------------------------------------------------------------------

    def mine(self, host_id: int) -> list[ListingCard]:
        return to_cards(self._session, repository.by_host(self._session, host_id))

    # --- writing --------------------------------------------------------------------------

    def create(self, host_id: int, body: ListingCreate) -> ListingDetail:
        now = now_utc()
        listing = Listing(
            host_id=host_id,
            property_type_id=self._property_type_id(body.property_type),
            created_at=now,
            updated_at=now,
            **body.model_dump(include=set(_PLAIN_FIELDS)),
        )
        self._session.add(listing)
        self._session.flush()
        self._replace_photos(listing.id, body.photos)
        self._replace_amenities(listing.id, body.amenities)
        return self._detail(listing.id)

    def update(self, host_id: int, listing_id: int, body: ListingUpdate) -> ListingDetail:
        """Only the fields that were sent change. Sending `photos` or `amenities` replaces
        the whole set. Existing bookings keep the price they were made at."""
        listing = self._owned(host_id, listing_id)
        changes: dict[str, Any] = body.model_dump(exclude_unset=True)

        for name in _PLAIN_FIELDS:
            if name in changes:
                setattr(listing, name, changes[name])
        if "property_type" in changes:
            listing.property_type_id = self._property_type_id(changes["property_type"])
        if "photos" in changes:
            self._replace_photos(listing.id, changes["photos"])
        if "amenities" in changes:
            self._replace_amenities(listing.id, changes["amenities"])
        listing.updated_at = now_utc()
        self._session.flush()
        return self._detail(listing.id)

    def remove(self, host_id: int, listing_id: int) -> None:
        """A soft delete, refused while the listing has upcoming reservations (REF-L1)."""
        listing = self._owned(host_id, listing_id)
        has_upcoming = self._session.execute(
            select(
                exists().where(
                    Booking.listing_id == listing.id,
                    Booking.status == STATUS_CONFIRMED,
                    Booking.check_out > self._today,
                )
            )
        ).scalar_one()
        if has_upcoming:
            raise AppError(
                "listing_has_upcoming_reservations",
                409,
                "This listing has upcoming reservations and cannot be removed yet.",
            )
        listing.deleted_at = now_utc()
        self._session.execute(delete(WishlistItem).where(WishlistItem.listing_id == listing.id))

    # --- helpers --------------------------------------------------------------------------

    def _owned(self, host_id: int, listing_id: int) -> Listing:
        listing = self._session.scalars(
            select(Listing).where(repository.ACTIVE, Listing.id == listing_id)
        ).one_or_none()
        if listing is None:
            raise listing_not_found()
        if listing.host_id != host_id:
            raise AppError("not_listing_owner", 403, "Only the host can change this listing.")
        return listing

    def _property_type_id(self, slug: str) -> int:
        type_id = self._session.scalars(
            select(PropertyType.id).where(PropertyType.slug == slug)
        ).one_or_none()
        if type_id is None:
            raise invalid_field("body.property_type", "Unknown property type.")
        return type_id

    def _replace_photos(self, listing_id: int, urls: list[str]) -> None:
        """Order is kept; the first photo is the cover."""
        self._session.execute(delete(ListingImage).where(ListingImage.listing_id == listing_id))
        self._session.add_all(
            ListingImage(listing_id=listing_id, url=url, position=position)
            for position, url in enumerate(urls)
        )
        self._session.flush()

    def _replace_amenities(self, listing_id: int, slugs: list[str]) -> None:
        wanted = list(dict.fromkeys(slugs))  # duplicates dropped, order kept
        found = {
            slug: amenity_id
            for slug, amenity_id in self._session.execute(
                select(Amenity.slug, Amenity.id).where(Amenity.slug.in_(wanted))
            )
        }
        unknown = [slug for slug in wanted if slug not in found]
        if unknown:
            raise invalid_field("body.amenities", f"Unknown amenity: {', '.join(unknown)}.")
        self._session.execute(delete(ListingAmenity).where(ListingAmenity.listing_id == listing_id))
        self._session.add_all(
            ListingAmenity(listing_id=listing_id, amenity_id=found[slug]) for slug in wanted
        )
        self._session.flush()

    def _detail(self, listing_id: int) -> ListingDetail:
        row = repository.one(self._session, listing_id)
        assert row is not None
        return to_detail(self._session, row)


def _reader(session: ReadSession, today: Today) -> HostListingService:
    return HostListingService(session, today)


def _writer(session: WriteSession, today: Today) -> HostListingService:
    """Every mutating request runs in the write session (BEGIN IMMEDIATE)."""
    return HostListingService(session, today)


HostListingReader = Annotated[HostListingService, Depends(_reader)]
HostListingWriter = Annotated[HostListingService, Depends(_writer)]
