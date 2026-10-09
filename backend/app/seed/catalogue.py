"""Seed builders for people, reference data and listings (plan §12)."""

import math
import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from app.listings.models import Amenity, Listing, ListingAmenity, ListingImage, PropertyType
from app.seed import data
from app.seed.photos import COVERS, INTERIOR_COVERS, ROOMS, photo_url
from app.users.models import User

PETS_ALLOWED_SHARE = 0.3
SHORT_GALLERY_LISTINGS = (10, 20)
SHORT_GALLERY_SIZE = 3

# Amenities that only make sense for some property types.
_ONLY_FOR = {
    "lift": {"apartment"},
    "gym": {"apartment", "villa"},
    "pool": {"villa", "house"},
    "indoor-fireplace": {"cabin", "cottage", "house"},
}
_DEMO_HOST_YEARS = (7, 5, 4, 3)


def moment(day: date) -> datetime:
    """A fixed time on `day` (noon in India), so seeded timestamps depend only on dates."""
    return datetime(day.year, day.month, day.day, 6, 30, tzinfo=UTC)


@dataclass(frozen=True)
class People:
    demo_hosts: list[User]
    demo_guests: list[User]
    seeded_hosts: list[User]
    others: list[User]

    def everyone(self) -> list[User]:
        return [*self.demo_hosts, *self.demo_guests, *self.seeded_hosts, *self.others]


def _user(name: str, bio: str | None, is_demo: bool, joined: date) -> User:
    email = name.lower().replace(" ", ".") + "@example.com"
    return User(name=name, email=email, bio=bio, is_demo=is_demo, created_at=moment(joined))


def build_people(today: date) -> People:
    hosts = [
        _user(name, bio, True, today - timedelta(days=365 * years))
        for (name, bio), years in zip(data.DEMO_HOSTS, _DEMO_HOST_YEARS, strict=True)
    ]
    guests = [
        _user(name, bio, True, today - timedelta(days=500 + 90 * index))
        for index, (name, bio) in enumerate(data.DEMO_GUESTS)
    ]
    seeded_hosts = [
        _user(name, bio, False, today - timedelta(days=365 * (3 + index % 4) + 30 * index))
        for index, (name, bio, _) in enumerate(data.SEEDED_HOSTS)
    ]
    others = [
        _user(name, None, False, today - timedelta(days=450 + 40 * index))
        for index, name in enumerate(data.OTHER_GUESTS)
    ]
    return People(hosts, guests, seeded_hosts, others)


def listing_hosts(people: People) -> list[User]:
    """The host of each listing, by listing index. The two single-listing demo hosts come
    first; the rest are dealt out in turn, so every host's homes are spread over the
    destinations."""
    main_a, main_b, single_a, single_b = people.demo_hosts
    remaining = [(main_a, data.MAIN_DEMO_HOST_LISTINGS), (main_b, data.MAIN_DEMO_HOST_LISTINGS)]
    remaining += [
        (host, count)
        for host, (_, _, count) in zip(people.seeded_hosts, data.SEEDED_HOSTS, strict=True)
    ]
    hosts = [single_a, single_b]
    for turn in range(max(count for _, count in remaining)):
        hosts.extend(host for host, count in remaining if turn < count)
    return hosts


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


def cover_pools() -> dict[str, list[str]]:
    """The covers each property type may use: its outside views, then its share of the
    interior photos set aside as covers. Each is handed out once."""
    pools = {type_slug: list(covers) for type_slug, covers in COVERS.items()}
    spare = iter(INTERIOR_COVERS)
    for type_slug, share in data.INTERIOR_COVER_SHARE.items():
        pools[type_slug].extend(next(spare) for _ in range(share))
    return pools


def plan_listings(covers: dict[str, list[str]]) -> list[tuple[data.Destination, str]]:
    """The place and property type of every listing, in the order they are created.

    Places take turns, so every page of results is varied. A place hands out its own
    types in order; a type is skipped once it has no cover left, so that every listing
    gets a cover of its own."""
    left = {type_slug: len(pool) for type_slug, pool in covers.items()}
    handed = dict.fromkeys(data.DESTINATIONS, 0)
    plan: list[tuple[data.Destination, str]] = []
    for turn in range(max(destination.listings for destination in data.DESTINATIONS)):
        for destination in data.DESTINATIONS:
            if turn >= destination.listings:
                continue
            types = destination.property_types
            rotation = [
                types[(handed[destination] + step) % len(types)] for step in range(len(types))
            ]
            type_slug = next(
                (candidate for candidate in rotation if left[candidate] > 0),
                max(left, key=lambda candidate: left[candidate]),
            )
            assert left[type_slug] > 0, "more listings than cover photos"
            left[type_slug] -= 1
            handed[destination] += 1
            plan.append((destination, type_slug))
    return plan


def _photos(index: int, cover: str) -> list[ListingImage]:
    last_room = "outdoor" if index % 2 else "dining"
    ids = [cover]
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
    """Every listing of plan §12. Later listings are newer, and the destinations take
    turns so that every page of results is varied.

    The amenity links are returned separately, as rows in a fixed order: written through
    the `Listing.amenities` collection their order would differ from run to run."""
    listings: list[Listing] = []
    links: list[ListingAmenity] = []
    titles: set[str] = set()
    covers = cover_pools()
    plan = plan_listings(covers)
    total = len(plan)
    hosts = listing_hosts(people)
    assert len(hosts) == total

    for destination, type_slug in plan:
        index = len(listings)
        profile = data.TYPE_PROFILES[type_slug]

        max_guests = rng.randint(*profile.max_guests)
        bedrooms = 0 if max_guests == 1 else math.ceil(max_guests / 2)
        nightly_rupees = rng.randrange(profile.nightly_rupees[0], profile.nightly_rupees[1], 100)
        cleaning_rupees = (
            0 if rng.random() < 0.2 else nightly_rupees * rng.randint(4, 12) // 100 // 100 * 100
        )
        title, description = _text(rng, profile.noun, destination.setting, titles)
        created = moment(today - timedelta(days=800 + total - index))

        listing = Listing(
            host=hosts[index],
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
            pets_allowed=rng.random() < PETS_ALLOWED_SHARE,
            created_at=created,
            updated_at=created,
            images=_photos(index, covers[type_slug].pop(0)),
        )
        listings.append(listing)
        links.extend(
            ListingAmenity(listing=listing, amenity=amenities[slug])
            for slug in _amenity_slugs(rng, type_slug, destination.location_amenity)
        )
    return listings, links
