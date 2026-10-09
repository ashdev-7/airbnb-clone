from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UtcDateTime
from app.users.models import User

AMENITY_CATEGORIES = (
    "bathroom",
    "bedroom_laundry",
    "entertainment",
    "family",
    "heating_cooling",
    "home_safety",
    "internet_office",
    "kitchen_dining",
    "location",
    "outdoor",
    "parking_facilities",
)
_CATEGORY_LIST = ", ".join(f"'{category}'" for category in AMENITY_CATEGORIES)


class PropertyType(Base):
    __tablename__ = "property_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]


class Amenity(Base):
    __tablename__ = "amenities"
    __table_args__ = (CheckConstraint(f"category IN ({_CATEGORY_LIST})", name="category_known"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    category: Mapped[str]


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint("length(trim(title)) > 0", name="title_not_empty"),
        CheckConstraint("length(trim(description)) > 0", name="description_not_empty"),
        CheckConstraint("latitude BETWEEN -90 AND 90", name="latitude_range"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="longitude_range"),
        CheckConstraint("(latitude IS NULL) = (longitude IS NULL)", name="coordinates_together"),
        CheckConstraint("price_per_night_minor > 0", name="price_positive"),
        CheckConstraint("cleaning_fee_minor >= 0", name="cleaning_fee_not_negative"),
        CheckConstraint("max_guests >= 1", name="max_guests_min"),
        CheckConstraint("bedrooms >= 0", name="bedrooms_min"),
        CheckConstraint("beds >= 1", name="beds_min"),
        CheckConstraint("bathrooms >= 1", name="bathrooms_min"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    property_type_id: Mapped[int] = mapped_column(
        ForeignKey("property_types.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str]
    description: Mapped[str]
    city: Mapped[str] = mapped_column(index=True)
    state: Mapped[str | None]
    country: Mapped[str]
    latitude: Mapped[float | None]
    longitude: Mapped[float | None]
    # Money is an integer number of paise (plan §8.4).
    price_per_night_minor: Mapped[int] = mapped_column(index=True)
    cleaning_fee_minor: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    max_guests: Mapped[int]
    bedrooms: Mapped[int]
    beds: Mapped[int]
    bathrooms: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)
    # Set when the host removes the listing; the row stays so past trips keep their link.
    deleted_at: Mapped[datetime | None] = mapped_column(UtcDateTime)

    host: Mapped[User] = relationship()
    property_type: Mapped[PropertyType] = relationship()
    images: Mapped[list["ListingImage"]] = relationship(
        order_by="ListingImage.position", cascade="all, delete-orphan", passive_deletes=True
    )
    # Read-only: links are written as ListingAmenity rows, which keeps their order fixed.
    amenities: Mapped[list[Amenity]] = relationship(
        secondary="listing_amenities", order_by=Amenity.id, viewonly=True
    )


class ListingImage(Base):
    """A photo by URL. Position 0 is the cover."""

    __tablename__ = "listing_images"
    __table_args__ = (
        CheckConstraint("position >= 0", name="position_not_negative"),
        UniqueConstraint("listing_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"))
    url: Mapped[str]
    position: Mapped[int]


class ListingAmenity(Base):
    __tablename__ = "listing_amenities"
    __table_args__ = (
        Index("ix_listing_amenities_amenity_id_listing_id", "amenity_id", "listing_id"),
    )

    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True
    )
    amenity_id: Mapped[int] = mapped_column(
        ForeignKey("amenities.id", ondelete="RESTRICT"), primary_key=True
    )

    listing: Mapped[Listing] = relationship()
    amenity: Mapped[Amenity] = relationship()
