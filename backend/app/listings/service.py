"""Reading the catalogue: search, detail, summary, suggestions and reference data."""

from collections.abc import Sequence
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy import Row, select
from sqlalchemy.orm import Session

from app.bookings import guests
from app.core.deps import AppSettings, ReadSession
from app.core.errors import AppError
from app.core.pagination import offset, total_pages
from app.listings import repository
from app.listings.models import AMENITY_CATEGORIES, Amenity, Listing, PropertyType
from app.listings.repository import ListingFilters
from app.listings.schemas import (
    AmenityOut,
    GuestLimitsOut,
    HistogramBucket,
    HostOut,
    ListingCard,
    ListingDetail,
    ListingPage,
    ListingSummary,
    LocationOut,
    MetaOut,
    PagedSearchParams,
    PropertyTypeOut,
    SearchParams,
)
from app.reviews.ratings import shown_average

HISTOGRAM_BUCKETS = 30


def listing_not_found() -> AppError:
    return AppError("listing_not_found", 404, "This listing does not exist.")


def to_filters(params: SearchParams) -> ListingFilters:
    return ListingFilters(
        location=params.location,
        guests=guests.counted_guests(params.adults, params.children),
        pets=params.pets,
        min_price_minor=params.min_price_minor,
        max_price_minor=params.max_price_minor,
        property_types=tuple(params.property_type),
        amenities=tuple(params.amenity),
        min_bedrooms=params.min_bedrooms,
        min_beds=params.min_beds,
        min_bathrooms=params.min_bathrooms,
    )


def card_fields(row: Row[Any], photo_urls: list[str]) -> dict[str, Any]:
    listing: Listing = row.Listing
    return {
        "id": listing.id,
        "title": listing.title,
        "property_type": PropertyTypeOut(slug=row.type_slug, name=row.type_name),
        "city": listing.city,
        "state": listing.state,
        "country": listing.country,
        "latitude": listing.latitude,
        "longitude": listing.longitude,
        "photos": photo_urls,
        "max_guests": listing.max_guests,
        "bedrooms": listing.bedrooms,
        "beds": listing.beds,
        "bathrooms": listing.bathrooms,
        "pets_allowed": listing.pets_allowed,
        "price_per_night_minor": listing.price_per_night_minor,
        "rating_average": shown_average(row.average, row.review_count),
        "review_count": row.review_count,
    }


def to_cards(session: Session, rows: Sequence[Row[Any]]) -> list[ListingCard]:
    """Cards for these rows, with one further statement for all their photos."""
    photos = repository.photos(session, [row.Listing.id for row in rows])
    return [ListingCard(**card_fields(row, photos[row.Listing.id])) for row in rows]


def to_detail(session: Session, row: Row[Any]) -> ListingDetail:
    listing: Listing = row.Listing
    host = listing.host
    photos = repository.photos(session, [listing.id], per_listing=None)[listing.id]
    return ListingDetail(
        **card_fields(row, photos),
        description=listing.description,
        cleaning_fee_minor=listing.cleaning_fee_minor,
        amenities=[
            AmenityOut(slug=amenity.slug, name=amenity.name, category=amenity.category)
            for amenity in repository.amenities_of(session, listing.id)
        ],
        host=HostOut(
            id=host.id,
            name=host.name,
            avatar_url=host.avatar_url,
            bio=host.bio,
            joined_at=host.created_at,
            listing_count=repository.active_listing_count(session, host.id),
        ),
        created_at=listing.created_at,
        updated_at=listing.updated_at,
    )


def _histogram(prices: Sequence[int]) -> list[HistogramBucket]:
    """Equal-width buckets between the lowest and highest price."""
    if not prices:
        return []
    low, high = min(prices), max(prices)
    width = max(1, -(-(high - low + 1) // HISTOGRAM_BUCKETS))  # ceiling division
    counts = [0] * HISTOGRAM_BUCKETS
    for price in prices:
        counts[(price - low) // width] += 1
    return [
        HistogramBucket(from_minor=low + n * width, to_minor=low + (n + 1) * width - 1, count=c)
        for n, c in enumerate(counts)
    ]


class ListingService:
    def __init__(self, session: ReadSession, settings: AppSettings) -> None:
        self._session: Session = session
        self._settings = settings

    def search(self, params: PagedSearchParams) -> ListingPage:
        filters = to_filters(params)
        total = repository.count(self._session, filters)
        rows = repository.search(
            self._session, filters, params.page_size, offset(params.page, params.page_size)
        )
        return ListingPage(
            items=to_cards(self._session, rows),
            page=params.page,
            page_size=params.page_size,
            total=total,
            total_pages=total_pages(total, params.page_size),
        )

    def summary(self, params: SearchParams) -> ListingSummary:
        """`total` honours every filter; the price range and histogram ignore the price
        bounds, so the filter's slider always spans what is available."""
        filters = to_filters(params)
        prices = repository.prices(self._session, filters)
        return ListingSummary(
            total=repository.count(self._session, filters),
            price_min_minor=min(prices) if prices else None,
            price_max_minor=max(prices) if prices else None,
            histogram=_histogram(prices),
        )

    def detail(self, listing_id: int) -> ListingDetail:
        row = repository.one(self._session, listing_id)
        if row is None:
            raise listing_not_found()
        return to_detail(self._session, row)

    def locations(self, query: str) -> list[LocationOut]:
        return [
            LocationOut(
                city=row.city, state=row.state, country=row.country, listing_count=row.listing_count
            )
            for row in repository.locations(self._session, query)
        ]

    def meta(self) -> MetaOut:
        property_types = self._session.scalars(select(PropertyType).order_by(PropertyType.id))
        amenities = self._session.scalars(select(Amenity).order_by(Amenity.id))
        return MetaOut(
            property_types=[PropertyTypeOut(slug=t.slug, name=t.name) for t in property_types],
            amenities=[
                AmenityOut(slug=a.slug, name=a.name, category=a.category) for a in amenities
            ],
            amenity_categories=list(AMENITY_CATEGORIES),
            service_fee_bps=self._settings.service_fee_bps,
            guest_limits=GuestLimitsOut(**guests.limits()),
        )


ListingServiceDep = Annotated[ListingService, Depends(ListingService)]
