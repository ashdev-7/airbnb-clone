"""Rebuild the database and load the seed (plan §12).

The content depends only on the date passed in: a fixed random seed makes two runs on
the same day identical, and no wall-clock time is read here.
"""

import random
from datetime import date

from app.db.schema import rebuild_schema
from app.db.session import Database
from app.seed.catalogue import build_amenities, build_listings, build_people, build_property_types
from app.seed.stays import StayBuilder

RANDOM_SEED = 20261009


def seed_database(database: Database, today: date, service_fee_bps: int) -> dict[str, int]:
    """Drop everything, recreate the schema and insert the seed in one transaction.
    Returns the number of rows written per kind."""
    rebuild_schema(database.engine)
    rng = random.Random(RANDOM_SEED)

    people = build_people(today)
    property_types = build_property_types()
    amenities = build_amenities()
    listings, amenity_links = build_listings(rng, today, people, property_types, amenities)
    stays = StayBuilder(rng, today, service_fee_bps, people, listings)
    stays.build()

    with database.write_session() as session:
        # Flushed group by group so that ids follow the order the rows were built in.
        for group in (
            people.everyone(),
            list(property_types.values()),
            list(amenities.values()),
            listings,
            amenity_links,
            stays.bookings,
            stays.reviews,
        ):
            session.add_all(group)
            session.flush()

    return {
        "users": len(people.everyone()),
        "property types": len(property_types),
        "amenities": len(amenities),
        "listings": len(listings),
        "amenity links": len(amenity_links),
        "photos": sum(len(listing.images) for listing in listings),
        "bookings": len(stays.bookings),
        "reviews": len(stays.reviews),
    }
