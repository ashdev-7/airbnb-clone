"""Shapes of the listing API (plan §11). Money is integer paise; `currency` is always INR."""

from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.bookings.guests import MAX_GUESTS, MAX_INFANTS, MAX_PETS

CURRENCY = "INR"
DEFAULT_PAGE_SIZE = 18  # captures B1 and B2 (docs/parity-notes.md)
MAX_PAGE_SIZE = 50

# --- output ------------------------------------------------------------------------------


class PropertyTypeOut(BaseModel):
    slug: str
    name: str


class AmenityOut(BaseModel):
    slug: str
    name: str
    category: str


class ListingCard(BaseModel):
    """Everything a card needs (plan §10.6)."""

    id: int
    title: str
    property_type: PropertyTypeOut
    city: str
    state: str | None
    country: str
    latitude: float | None
    longitude: float | None
    photos: list[str]
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    pets_allowed: bool
    price_per_night_minor: int
    currency: str = CURRENCY
    # None until the listing has three reviews; the card then shows "New".
    rating_average: float | None
    review_count: int


class HostOut(BaseModel):
    id: int
    name: str
    avatar_url: str | None
    bio: str | None
    joined_at: datetime
    listing_count: int


class ListingDetail(ListingCard):
    description: str
    cleaning_fee_minor: int
    amenities: list[AmenityOut]
    host: HostOut
    created_at: datetime
    updated_at: datetime


class ListingPage(BaseModel):
    items: list[ListingCard]
    page: int
    page_size: int
    total: int
    total_pages: int


class ListingList(BaseModel):
    items: list[ListingCard]


class HistogramBucket(BaseModel):
    from_minor: int
    to_minor: int
    count: int


class ListingSummary(BaseModel):
    total: int
    price_min_minor: int | None
    price_max_minor: int | None
    currency: str = CURRENCY
    histogram: list[HistogramBucket]


class LocationOut(BaseModel):
    """A place suggestion. `label` is what is shown and what is sent back as `location`."""

    kind: Literal["city", "state", "country"]
    label: str
    city: str | None
    state: str | None
    country: str
    listing_count: int


class LocationsOut(BaseModel):
    items: list[LocationOut]


class GuestLimitsOut(BaseModel):
    min_adults: int
    max_guests: int
    max_infants: int
    max_pets: int


class MetaOut(BaseModel):
    property_types: list[PropertyTypeOut]
    amenities: list[AmenityOut]
    amenity_categories: list[str]
    service_fee_bps: int
    currency: str = CURRENCY
    guest_limits: GuestLimitsOut
    default_page_size: int = DEFAULT_PAGE_SIZE
    max_page_size: int = MAX_PAGE_SIZE


# --- search parameters -------------------------------------------------------------------


class SearchParams(BaseModel):
    """Query parameters of GET /api/listings and /api/listings/summary (plan §10.6)."""

    location: str | None = Field(None, max_length=200)
    adults: int = Field(0, ge=0, le=MAX_GUESTS)
    children: int = Field(0, ge=0, le=MAX_GUESTS)
    infants: int = Field(0, ge=0, le=MAX_INFANTS)
    pets: int = Field(0, ge=0, le=MAX_PETS)
    min_price_minor: int | None = Field(None, ge=0)
    max_price_minor: int | None = Field(None, ge=0)
    property_type: list[str] = Field(default_factory=list, max_length=20)
    amenity: list[str] = Field(default_factory=list, max_length=50)
    min_bedrooms: int = Field(0, ge=0, le=50)
    min_beds: int = Field(0, ge=0, le=50)
    min_bathrooms: int = Field(0, ge=0, le=50)

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        if self.adults + self.children > MAX_GUESTS:
            raise ValueError(f"At most {MAX_GUESTS} guests")
        if (
            self.min_price_minor is not None
            and self.max_price_minor is not None
            and self.min_price_minor > self.max_price_minor
        ):
            raise ValueError("min_price_minor cannot be greater than max_price_minor")
        return self


class PagedSearchParams(SearchParams):
    page: int = Field(1, ge=1)
    page_size: int = Field(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)


# --- host input (plan §10.5) -------------------------------------------------------------

MIN_PRICE_MINOR, MAX_PRICE_MINOR = 500_00, 5_00_000_00
MAX_CLEANING_FEE_MINOR = 25_000_00
WHOLE_RUPEES = 100

Trimmed = StringConstraints(strip_whitespace=True)
Title = Annotated[str, Trimmed, StringConstraints(min_length=5, max_length=80)]
Description = Annotated[str, Trimmed, StringConstraints(min_length=1, max_length=5000)]
Place = Annotated[str, Trimmed, StringConstraints(min_length=1, max_length=100)]
Slug = Annotated[str, Trimmed, StringConstraints(min_length=1, max_length=60)]
PhotoUrl = Annotated[str, Trimmed, StringConstraints(pattern=r"^https://\S+$", max_length=2000)]
Price = Annotated[int, Field(ge=MIN_PRICE_MINOR, le=MAX_PRICE_MINOR, multiple_of=WHOLE_RUPEES)]
CleaningFee = Annotated[int, Field(ge=0, le=MAX_CLEANING_FEE_MINOR, multiple_of=WHOLE_RUPEES)]
Photos = Annotated[list[PhotoUrl], Field(min_length=1, max_length=20)]
Amenities = Annotated[list[Slug], Field(max_length=100)]


class ListingCreate(BaseModel):
    """There is no `host_id` here: the host is the signed-in user. Unknown fields are refused."""

    model_config = ConfigDict(extra="forbid")

    title: Title
    description: Description
    property_type: Slug
    city: Place
    state: Place | None = None
    country: Place
    price_per_night_minor: Price
    cleaning_fee_minor: CleaningFee = 0
    max_guests: int = Field(ge=1, le=16)
    bedrooms: int = Field(ge=0, le=20)
    beds: int = Field(ge=1, le=30)
    bathrooms: int = Field(ge=1, le=20)
    pets_allowed: bool = False
    photos: Photos
    amenities: Amenities = Field(default_factory=list)


class ListingUpdate(BaseModel):
    """A partial update: only the fields that are sent change. `state` may be cleared with
    null; every other field, if sent, must have a value."""

    model_config = ConfigDict(extra="forbid")

    title: Title | None = None
    description: Description | None = None
    property_type: Slug | None = None
    city: Place | None = None
    state: Place | None = None
    country: Place | None = None
    price_per_night_minor: Price | None = None
    cleaning_fee_minor: CleaningFee | None = None
    max_guests: int | None = Field(None, ge=1, le=16)
    bedrooms: int | None = Field(None, ge=0, le=20)
    beds: int | None = Field(None, ge=1, le=30)
    bathrooms: int | None = Field(None, ge=1, le=20)
    pets_allowed: bool | None = None
    photos: Photos | None = None
    amenities: Amenities | None = None

    @model_validator(mode="after")
    def _no_nulls(self) -> Self:
        for name in self.model_fields_set - {"state"}:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self
