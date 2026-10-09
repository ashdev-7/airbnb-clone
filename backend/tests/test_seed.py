"""Plan §12 and §13: the seed has the promised shape and keeps every invariant."""

from collections.abc import Iterator
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import Connection

from app.bookings.pricing import calculate_price
from app.db.engine import create_db_engine
from app.db.session import Database
from app.seed.loader import seed_database

TODAY = date(2026, 10, 9)
FEE_BPS = 1500
DEMO_HOSTS = ("Ananya Rao", "Vikram Mehta", "Leela Nair", "Kabir Sethi")
MEERA, ARJUN, ZOYA = "Meera Iyer", "Arjun Kapoor", "Zoya Khan"
DATA_TABLES = (
    "users",
    "property_types",
    "amenities",
    "listings",
    "listing_images",
    "listing_amenities",
    "bookings",
    "reviews",
    "wishlist_items",
)


def seeded(path: Path, today: date = TODAY) -> Database:
    database = Database(create_db_engine(f"sqlite:///{path.as_posix()}", 5000))
    seed_database(database, today, FEE_BPS)
    return database


def dump(database: Database) -> dict[str, list[tuple[Any, ...]]]:
    with database.engine.connect() as connection:
        return {
            table: [tuple(row) for row in connection.exec_driver_sql(f"SELECT * FROM {table}")]
            for table in DATA_TABLES
        }


@pytest.fixture(scope="module")
def database(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Database]:
    database = seeded(tmp_path_factory.mktemp("seed") / "seed.db")
    yield database
    database.engine.dispose()


@pytest.fixture
def db(database: Database) -> Iterator[Connection]:
    with database.engine.connect() as connection:
        yield connection


def scalar(db: Connection, sql: str, *parameters: Any) -> Any:
    return db.exec_driver_sql(sql, parameters).scalar_one()


def column(db: Connection, sql: str, *parameters: Any) -> list[Any]:
    return [row[0] for row in db.exec_driver_sql(sql, parameters)]


# --- reference data and people -----------------------------------------------------------


def test_users(db: Connection) -> None:
    assert scalar(db, "SELECT count(*) FROM users") == 28
    assert scalar(db, "SELECT count(*) FROM users WHERE avatar_url IS NOT NULL") == 0
    demo = column(db, "SELECT name FROM users WHERE is_demo ORDER BY id")
    assert demo == [*DEMO_HOSTS, MEERA, ARJUN, ZOYA]


def test_property_types_and_amenities(db: Connection) -> None:
    assert scalar(db, "SELECT count(*) FROM property_types") == 8
    assert scalar(db, "SELECT count(*) FROM amenities") >= 30
    assert scalar(db, "SELECT count(DISTINCT category) FROM amenities") == 11
    # Whether pets may come is a column on the listing, not an amenity.
    assert scalar(db, "SELECT count(*) FROM amenities WHERE slug LIKE '%pet%'") == 0


def test_listings_are_spread_over_about_twelve_hosts(db: Connection) -> None:
    counts = dict(
        tuple(row)
        for row in db.exec_driver_sql(
            "SELECT u.name, count(*) FROM listings l JOIN users u ON u.id = l.host_id GROUP BY u.id"
        )
    )
    assert len(counts) == 12 and sum(counts.values()) == 60
    assert counts["Leela Nair"] == counts["Kabir Sethi"] == 1
    assert counts["Ananya Rao"] == counts["Vikram Mehta"] == 6
    others = [count for name, count in counts.items() if name not in DEMO_HOSTS]
    assert len(others) == 8 and all(3 <= count <= 7 for count in others)
    assert (
        scalar(
            db,
            "SELECT count(*) FROM users u WHERE NOT u.is_demo"
            " AND EXISTS (SELECT 1 FROM listings l WHERE l.host_id = u.id)",
        )
        == 8
    )


def test_no_host_has_all_their_listings_in_one_city(db: Connection) -> None:
    cities = column(
        db, "SELECT count(DISTINCT city) FROM listings GROUP BY host_id HAVING count(*) > 1"
    )
    assert all(count > 1 for count in cities)


# --- listings ----------------------------------------------------------------------------


def test_listings_cover_the_destinations_types_prices_and_sizes(db: Connection) -> None:
    assert scalar(db, "SELECT count(*) FROM listings") == 60
    assert scalar(db, "SELECT count(DISTINCT city) FROM listings") >= 10
    assert scalar(db, "SELECT count(DISTINCT property_type_id) FROM listings") == 8
    assert scalar(db, "SELECT count(*) FROM listings WHERE country <> 'India'") == 0
    assert scalar(db, "SELECT count(*) FROM listings WHERE latitude IS NULL") == 0

    low, high = db.exec_driver_sql(
        "SELECT min(price_per_night_minor), max(price_per_night_minor) FROM listings"
    ).one()
    assert 150_000 <= low < 400_000 and 3_000_000 < high <= 6_000_000
    assert (
        tuple(db.exec_driver_sql("SELECT min(max_guests), max(max_guests) FROM listings").one())[0]
        >= 1
    )
    assert scalar(db, "SELECT max(max_guests) FROM listings") <= 12
    assert scalar(db, "SELECT count(DISTINCT max_guests) FROM listings") >= 6


def test_listings_satisfy_the_host_form_rules(db: Connection) -> None:
    """Plan §10.5: a seeded listing could have been created through the API."""
    for title, price, cleaning, guests, bedrooms, beds, bathrooms in db.exec_driver_sql(
        "SELECT title, price_per_night_minor, cleaning_fee_minor, max_guests, bedrooms, beds,"
        " bathrooms FROM listings"
    ):
        assert 5 <= len(title) <= 80
        assert price % 100 == 0 and 50_000 <= price <= 50_000_000
        assert cleaning % 100 == 0 and 0 <= cleaning <= 2_500_000
        assert 1 <= guests <= 16 and 0 <= bedrooms <= 20 and 1 <= beds <= 30
        assert 1 <= bathrooms <= 20
    assert scalar(db, "SELECT count(DISTINCT title) FROM listings") == 60


def test_photos(db: Connection) -> None:
    per_listing = column(
        db, "SELECT count(*) FROM listing_images GROUP BY listing_id ORDER BY listing_id"
    )
    assert len(per_listing) == 60
    assert sorted(per_listing)[:3] == [3, 3, 5] or sorted(per_listing)[:3] == [3, 3, 6]
    assert all(count >= 5 for count in sorted(per_listing)[2:])
    assert scalar(db, "SELECT count(*) FROM listing_images WHERE url NOT LIKE 'https://%'") == 0
    # Positions run 0, 1, 2, … with no gap.
    assert (
        scalar(
            db,
            "SELECT count(*) FROM (SELECT listing_id FROM listing_images GROUP BY listing_id"
            " HAVING min(position) <> 0 OR max(position) <> count(*) - 1)",
        )
        == 0
    )
    # No photo appears twice in one gallery.
    assert (
        scalar(
            db,
            "SELECT count(*) FROM (SELECT 1 FROM listing_images GROUP BY listing_id, url"
            " HAVING count(*) > 1)",
        )
        == 0
    )


def test_every_listing_has_amenities_and_some_allow_pets(db: Connection) -> None:
    assert scalar(db, "SELECT count(DISTINCT listing_id) FROM listing_amenities") == 60
    assert 8 <= scalar(db, "SELECT count(*) FROM listings WHERE pets_allowed") <= 30


# --- bookings and reviews ----------------------------------------------------------------


def test_no_confirmed_bookings_overlap(db: Connection) -> None:
    assert (
        scalar(
            db,
            "SELECT count(*) FROM bookings a JOIN bookings b ON a.listing_id = b.listing_id"
            " AND a.id < b.id AND a.status = 'confirmed' AND b.status = 'confirmed'"
            " AND a.check_in < b.check_out AND b.check_in < a.check_out",
        )
        == 0
    )


def test_every_total_comes_from_the_pricing_module(db: Connection) -> None:
    rows = db.exec_driver_sql(
        "SELECT b.nightly_price_minor, b.cleaning_fee_minor, b.service_fee_minor, b.total_minor,"
        " julianday(b.check_out) - julianday(b.check_in), l.price_per_night_minor,"
        " l.cleaning_fee_minor FROM bookings b JOIN listings l ON l.id = b.listing_id"
    ).all()
    assert len(rows) > 500
    for nightly, cleaning, service, total, nights, listing_price, listing_cleaning in rows:
        price = calculate_price(listing_price, listing_cleaning, int(nights), FEE_BPS)
        assert (nightly, cleaning, service, total) == (
            price.nightly_price_minor,
            price.cleaning_fee_minor,
            price.service_fee_minor,
            price.total_minor,
        )


def test_bookings_respect_the_guest_rules(db: Connection) -> None:
    assert (
        scalar(
            db,
            "SELECT count(*) FROM bookings b JOIN listings l ON l.id = b.listing_id"
            " WHERE b.adults + b.children > l.max_guests OR b.guest_id = l.host_id",
        )
        == 0
    )
    assert (
        scalar(
            db,
            "SELECT count(*) FROM bookings b JOIN listings l ON l.id = b.listing_id"
            " WHERE b.pets > 0 AND NOT l.pets_allowed",
        )
        == 0
    )


def test_there_are_past_current_and_upcoming_stays(db: Connection) -> None:
    today = TODAY.isoformat()
    confirmed = "SELECT count(*) FROM bookings WHERE status = 'confirmed' AND "
    assert scalar(db, confirmed + "check_out <= ?", today) > 500
    assert scalar(db, confirmed + "check_in <= ? AND check_out > ?", today, today) == 2
    assert 25 <= scalar(db, confirmed + "check_in > ?", today) <= 35


def test_a_back_to_back_pair_of_upcoming_stays_exists(db: Connection) -> None:
    assert (
        scalar(
            db,
            "SELECT count(*) FROM bookings a JOIN bookings b ON a.listing_id = b.listing_id"
            " AND a.check_out = b.check_in AND a.status = 'confirmed' AND b.status = 'confirmed'"
            " WHERE a.check_in > ?",
            TODAY.isoformat(),
        )
        >= 1
    )


def test_one_cancelled_booking_overlaps_a_confirmed_one(db: Connection) -> None:
    assert scalar(db, "SELECT count(*) FROM bookings WHERE status = 'cancelled'") == 1
    assert (
        scalar(
            db,
            "SELECT count(*) FROM bookings c JOIN bookings b ON b.listing_id = c.listing_id"
            " AND b.status = 'confirmed' AND c.check_in < b.check_out AND b.check_in < c.check_out"
            " WHERE c.status = 'cancelled'",
        )
        >= 1
    )


def test_one_listing_is_almost_fully_booked_next_month(db: Connection) -> None:
    listing = scalar(
        db,
        "SELECT l.id FROM listings l JOIN users u ON u.id = l.host_id WHERE u.name = 'Kabir Sethi'",
    )
    stays = db.exec_driver_sql(
        "SELECT check_in, check_out FROM bookings WHERE listing_id = ? AND status = 'confirmed'"
        " AND check_in >= '2026-11-01' AND check_out <= '2026-12-01'",
        (listing,),
    ).all()
    nights = sum(
        (date.fromisoformat(check_out) - date.fromisoformat(check_in)).days
        for check_in, check_out in stays
    )
    assert nights == 28  # all of November's 30 nights but two


def test_demo_guests_have_the_promised_trips(db: Connection) -> None:
    def trips(name: str, condition: str = "1 = 1") -> int:
        return int(
            scalar(
                db,
                "SELECT count(*) FROM bookings b JOIN users u ON u.id = b.guest_id"
                f" WHERE u.name = ? AND {condition}",
                name,
            )
        )

    today = f"'{TODAY.isoformat()}'"
    assert trips(MEERA, f"check_out <= {today}") >= 3
    assert trips(MEERA, f"check_in > {today} AND status = 'confirmed'") >= 3
    assert trips(MEERA, "status = 'cancelled'") == 1
    assert trips(ARJUN, f"check_out <= {today}") >= 3
    assert trips(ARJUN, f"check_out > {today}") == 0
    assert trips(ZOYA) == 0


def test_review_counts_most_listings_rated_a_few_new(db: Connection) -> None:
    counts = column(
        db,
        "SELECT count(r.id) FROM listings l LEFT JOIN bookings b ON b.listing_id = l.id"
        " LEFT JOIN reviews r ON r.booking_id = b.id GROUP BY l.id",
    )
    assert len(counts) == 60 and max(counts) <= 40
    assert sum(1 for count in counts if count < 3) == 4
    assert sum(1 for count in counts if count >= 3) == 56


def test_reviews_follow_completed_stays_within_the_window(db: Connection) -> None:
    assert (
        scalar(
            db,
            "SELECT count(*) FROM reviews r JOIN bookings b ON b.id = r.booking_id"
            " WHERE b.status <> 'confirmed' OR b.check_out > ? OR date(r.created_at) < b.check_out"
            " OR julianday(date(r.created_at)) - julianday(b.check_out) > 14"
            " OR date(r.created_at) > ?",
            TODAY.isoformat(),
            TODAY.isoformat(),
        )
        == 0
    )
    assert scalar(db, "SELECT count(DISTINCT rating) FROM reviews") >= 4


def test_the_database_is_internally_consistent(db: Connection) -> None:
    assert db.exec_driver_sql("PRAGMA foreign_key_check").all() == []
    assert scalar(db, "PRAGMA integrity_check") == "ok"


# --- determinism -------------------------------------------------------------------------


def test_two_runs_on_the_same_day_are_identical(database: Database, tmp_path: Path) -> None:
    other = seeded(tmp_path / "other.db")
    try:
        assert dump(other) == dump(database)
    finally:
        other.engine.dispose()


def test_seeding_again_replaces_the_data_with_the_same_content(tmp_path: Path) -> None:
    database = seeded(tmp_path / "again.db")
    try:
        first = dump(database)
        seed_database(database, TODAY, FEE_BPS)
        assert dump(database) == first
    finally:
        database.engine.dispose()


@pytest.mark.parametrize("today", [date(2027, 1, 31), date(2028, 2, 29), date(2026, 12, 15)])
def test_the_seed_is_valid_on_awkward_dates(tmp_path: Path, today: date) -> None:
    """Month ends, a leap day and a year boundary: the stays still fit and still move."""
    database = seeded(tmp_path / "dated.db", today)
    try:
        with database.engine.connect() as connection:
            upcoming = connection.exec_driver_sql(
                "SELECT count(*) FROM bookings WHERE status = 'confirmed' AND check_in > ?",
                (today.isoformat(),),
            ).scalar_one()
            latest_past = connection.exec_driver_sql(
                "SELECT max(check_out) FROM bookings WHERE check_out <= ?", (today.isoformat(),)
            ).scalar_one()
        assert 25 <= upcoming <= 35
        assert date.fromisoformat(latest_past) >= today - timedelta(days=9)
    finally:
        database.engine.dispose()
