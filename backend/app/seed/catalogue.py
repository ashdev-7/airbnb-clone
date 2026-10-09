"""Seed builders for people, reference data and listings (plan §12)."""

import math
import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from app.listings.models import Amenity, Listing, ListingAmenity, ListingImage, PropertyType
from app.seed import data
from app.seed.photos import COVERS, ROOMS, photo_url
from app.users.models import User

# Listings by index: who hosts the single-listing accounts, and which galleries are short.
SINGLE_LISTING_HOST = {0: 2, 1: 3}  # listing index → index into the demo hosts
SHORT_GALLERY_LISTINGS = (10, 20)
SHORT_GALLERY_SIZE = 3

# Amenities that only make sense for some property types.
_ONLY_FOR = {
    "lift": {"apartment"},
    "gym": {"apartment", "villa"},
    "pool": {"villa", "house"},
    "indoor-fireplace": {"cabin", "cottage", "house"},
}
_HOST_YEARS = (7, 5, 4, 3)


def moment(day: date) -> datetime:
    """A fixed time on `day` (noon in India), so seeded timestamps depend only on dates."""
    return datetime(day.year, day.month, day.day, 6, 30, tzinfo=UTC)


@dataclass(frozen=True)
class People:
    demo_hosts: list[User]
    demo_guests: list[User]
    others: list[User]

    def everyone(self) -> list[User]:
        return [*self.demo_hosts, *self.demo_guests, *self.others]


def _user(name: str, bio: str | None, is_demo: bool, joined: date) -> User:
    email = name.lower().replace(" ", ".") + "@example.com"
    return User(name=name, email=email, bio=bio, is_demo=is_demo, created_at=moment(joined))


def build_people(today: date) -> People:
    hosts = [
        _user(name, bio, True, today - timedelta(days=365 * years))
        for (name, bio), years in zip(data.DEMO_HOSTS, _HOST_YEARS, strict=True)
    ]
    guests = [
        _user(name, bio, True, today - timedelta(days=500 + 90 * index))
        for index, (name, bio) in enumerate(data.DEMO_GUESTS)
    ]
    others = [
        _user(name, None, False, today - timedelta(days=450 + 40 * index))
        for index, name in enumerate(data.OTHER_GUESTS)
    ]
    return People(hosts, guests, others)


def build_property_types() -> dict[str, PropertyType]:
    return {slug: PropertyType(slug=slug, name=name) for slug, name in data.PROPERTY_TYPES}


def build_amenities() -> dict[str, Amenity]:
    return {
        slug: Amenity(slug=slug, name=name, category=category)
        for slug, name, category in data.AMENITIES
    }


def _amenity_slugs(rng: random.Random, type_slug: str, location: str | None) -> list[str]:
    allowed = [
        slug for slug in data.OPTIONAL_AMENITIES if type_slug in _ONLY_FOR.get(slug, {type_slug})
    ]
    chosen = {*data.COMMON_AMENITIES, *rng.sample(allowed, k=rng.randint(6, 12))}
    if location:
        chosen.add(location)
    # Keep the catalogue's order, so the result does not depend on set ordering.
    return [slug for slug, _, _ in data.AMENITIES if slug in chosen]


def _photos(index: int, type_slug: str) -> list[ListingImage]:
    covers = COVERS[type_slug]
    last_room = "outdoor" if index % 2 else "dining"
    ids = [covers[(index // len(data.DESTINATIONS) + index) % len(covers)]]
    for offset, room in enumerate(("living", "bedroom", "kitchen", "bathroom", last_room)):
        pool = ROOMS[room]
        ids.append(pool[(index + offset * 3) % len(pool)])
    if index in SHORT_GALLERY_LISTINGS:
        ids = ids[:SHORT_GALLERY_SIZE]
    return [ListingImage(url=photo_url(photo_id), position=n) for n, photo_id in enumerate(ids)]


def _text(rng: random.Random, noun: str, setting: str, used: set[str]) -> tuple[str, str]:
    while True:
        adjective = rng.choice(data.TITLE_ADJECTIVES)
        title = f"{adjective} {noun} {rng.choice(data.TITLE_FEATURES)}"
        if title not in used:
            used.add(title)
            break
    description = " ".join(
        (
            rng.choice(data.DESCRIPTION_OPENERS).format(
                adjective=adjective.lower(), noun=noun, setting=setting
            ),
            rng.choice(data.DESCRIPTION_DETAILS),
            rng.choice(data.DESCRIPTION_CLOSERS),
        )
    )
    return title, description


def build_listings(
    rng: random.Random,
    today: date,
    people: People,
    property_types: dict[str, PropertyType],
    amenities: dict[str, Amenity],
) -> tuple[list[Listing], list[ListingAmenity]]:
    """Five listings in each destination. Later listings are newer, and the destinations
    are interleaved so that every page of results is varied.

    The amenity links are returned separately, as rows in a fixed order: written through
    the `Listing.amenities` collection their order would differ from run to run."""
    listings: list[Listing] = []
    links: list[ListingAmenity] = []
    titles: set[str] = set()
    slots = len(data.DESTINATIONS[0].property_types)
    total = slots * len(data.DESTINATIONS)

    for slot in range(slots):
        for destination in data.DESTINATIONS:
            index = len(listings)
            type_slug = destination.property_types[slot]
            profile = data.TYPE_PROFILES[type_slug]

            max_guests = rng.randint(*profile.max_guests)
            bedrooms = 0 if max_guests == 1 else math.ceil(max_guests / 2)
            nightly_rupees = rng.randrange(
                profile.nightly_rupees[0], profile.nightly_rupees[1], 100
            )
            cleaning_rupees = (
                0 if rng.random() < 0.2 else nightly_rupees * rng.randint(4, 12) // 100 // 100 * 100
            )
            title, description = _text(rng, profile.noun, destination.setting, titles)
            created = moment(today - timedelta(days=800 + total - index))
            host = people.demo_hosts[SINGLE_LISTING_HOST.get(index, index % 2)]

            listing = Listing(
                host=host,
                property_type=property_types[type_slug],
                title=title,
                description=description,
                city=destination.city,
                state=destination.state,
                country=data.COUNTRY,
                latitude=round(destination.latitude + rng.uniform(-0.02, 0.02), 5),
                longitude=round(destination.longitude + rng.uniform(-0.02, 0.02), 5),
                price_per_night_minor=nightly_rupees * 100,
                cleaning_fee_minor=cleaning_rupees * 100,
                max_guests=max_guests,
                bedrooms=bedrooms,
                beds=max(1, bedrooms, math.ceil(max_guests / 2)),
                bathrooms=max(1, bedrooms - rng.randint(0, 1)),
                created_at=created,
                updated_at=created,
                images=_photos(index, type_slug),
            )
            listings.append(listing)
            links.extend(
                ListingAmenity(listing=listing, amenity=amenities[slug])
                for slug in _amenity_slugs(rng, type_slug, destination.location_amenity)
            )
    return listings, links
