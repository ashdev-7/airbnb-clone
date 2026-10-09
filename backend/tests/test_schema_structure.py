"""Plan §8.1–8.3: the tables, indexes, triggers and foreign-key actions that must exist."""

from collections.abc import Iterator

import pytest
from sqlalchemy import Connection
from sqlalchemy.exc import IntegrityError

from app.db.schema import rebuild_schema
from app.db.session import Database
from tests import db_rows as rows

TABLES = {
    "users",
    "property_types",
    "amenities",
    "listings",
    "listing_images",
    "listing_amenities",
    "bookings",
    "reviews",
    "wishlist_items",
}

# Plan §8.2: index name → the columns it must cover, in order.
INDEXES = {
    "ix_listings_host_id": ["host_id"],
    "ix_listings_city": ["city"],
    "ix_listings_property_type_id": ["property_type_id"],
    "ix_listings_price_per_night_minor": ["price_per_night_minor"],
    "ix_listing_amenities_amenity_id_listing_id": ["amenity_id", "listing_id"],
    "ix_bookings_listing_id_check_in_check_out_confirmed": ["listing_id", "check_in", "check_out"],
    "ix_bookings_guest_id_check_in": ["guest_id", "check_in"],
    "ix_wishlist_items_listing_id": ["listing_id"],
}


@pytest.fixture
def conn(database: Database) -> Iterator[Connection]:
    with database.engine.connect() as connection:
        yield connection


def names(connection: Connection, kind: str) -> set[str]:
    result = connection.exec_driver_sql("SELECT name FROM sqlite_master WHERE type = ?", (kind,))
    return {row[0] for row in result}


def test_every_table_exists(conn: Connection) -> None:
    assert names(conn, "table") >= TABLES


def test_every_index_exists_on_the_right_columns(conn: Connection) -> None:
    for index, expected in INDEXES.items():
        columns = [row[2] for row in conn.exec_driver_sql(f"PRAGMA index_info('{index}')")]
        assert columns == expected, index


def test_the_availability_index_covers_confirmed_bookings_only(conn: Connection) -> None:
    sql = conn.exec_driver_sql(
        "SELECT sql FROM sqlite_master WHERE name = ?",
        ("ix_bookings_listing_id_check_in_check_out_confirmed",),
    ).scalar_one()
    assert "WHERE status = 'confirmed'" in sql


def test_both_overlap_triggers_exist(conn: Connection) -> None:
    assert names(conn, "trigger") == {"bookings_no_overlap_insert", "bookings_no_overlap_update"}


def test_rebuilding_the_schema_recreates_the_triggers_and_empties_the_tables(
    database: Database, conn: Connection
) -> None:
    rows.booking(conn)
    conn.commit()
    conn.close()

    rebuild_schema(database.engine)

    with database.engine.connect() as fresh:
        assert names(fresh, "trigger") == {
            "bookings_no_overlap_insert",
            "bookings_no_overlap_update",
        }
        assert fresh.exec_driver_sql("SELECT count(*) FROM bookings").scalar_one() == 0
        assert fresh.exec_driver_sql("SELECT count(*) FROM users").scalar_one() == 0


# --- foreign-key actions -----------------------------------------------------------------


def test_deleting_a_listing_cascades_to_its_images_amenities_and_wishlist_entries(
    conn: Connection,
) -> None:
    listing = rows.listing(conn)
    rows.insert(
        conn, "listing_images", {"listing_id": listing, "url": "https://x/a", "position": 0}
    )
    rows.insert(
        conn, "listing_amenities", {"listing_id": listing, "amenity_id": rows.amenity(conn)}
    )
    rows.insert(
        conn,
        "wishlist_items",
        {"user_id": rows.user(conn), "listing_id": listing, "created_at": rows.NOW},
    )

    conn.exec_driver_sql("DELETE FROM listings WHERE id = ?", (listing,))

    for table in ("listing_images", "listing_amenities", "wishlist_items"):
        assert conn.exec_driver_sql(f"SELECT count(*) FROM {table}").scalar_one() == 0, table
    assert conn.exec_driver_sql("SELECT count(*) FROM amenities").scalar_one() == 1


def test_deleting_a_user_cascades_to_their_wishlist(conn: Connection) -> None:
    user = rows.user(conn)
    rows.insert(
        conn,
        "wishlist_items",
        {"user_id": user, "listing_id": rows.listing(conn), "created_at": rows.NOW},
    )
    conn.exec_driver_sql("DELETE FROM users WHERE id = ?", (user,))
    assert conn.exec_driver_sql("SELECT count(*) FROM wishlist_items").scalar_one() == 0


def test_rows_that_history_depends_on_cannot_be_deleted(conn: Connection) -> None:
    host, guest = rows.user(conn), rows.user(conn)
    kind, amenity = rows.property_type(conn), rows.amenity(conn)
    listing = rows.listing(conn, host_id=host, property_type_id=kind)
    rows.insert(conn, "listing_amenities", {"listing_id": listing, "amenity_id": amenity})
    booking = rows.booking(conn, listing_id=listing, guest_id=guest)
    rows.review(conn, booking_id=booking)

    for table, row_id in (
        ("users", host),  # owns a listing
        ("users", guest),  # made a booking
        ("property_types", kind),  # classifies a listing
        ("amenities", amenity),  # offered by a listing
        ("listings", listing),  # has a booking
        ("bookings", booking),  # has a review
    ):
        with pytest.raises(IntegrityError):
            conn.exec_driver_sql(f"DELETE FROM {table} WHERE id = ?", (row_id,))
