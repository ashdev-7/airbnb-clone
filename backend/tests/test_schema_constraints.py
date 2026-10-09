"""Plan §8.1: every constraint is enforced by the database, for any writer."""

from collections.abc import Iterator
from typing import Any

import pytest
from sqlalchemy import Connection
from sqlalchemy.exc import IntegrityError

from app.db.session import Database
from tests import db_rows as rows


@pytest.fixture
def conn(database: Database) -> Iterator[Connection]:
    with database.engine.connect() as connection:
        yield connection


def rejected(connection: Connection, build: Any, **bad: Any) -> None:
    with pytest.raises(IntegrityError):
        build(connection, **bad)


# --- users -------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bad",
    [{"name": None}, {"name": ""}, {"name": "   "}, {"email": None}, {"created_at": None}],
)
def test_users_reject(conn: Connection, bad: dict[str, Any]) -> None:
    rejected(conn, rows.user, **bad)


def test_users_email_is_unique(conn: Connection) -> None:
    rows.user(conn, email="same@example.com")
    rejected(conn, rows.user, email="same@example.com")


def test_users_is_demo_defaults_to_false_and_must_be_boolean(conn: Connection) -> None:
    user_id = rows.user(conn)
    is_demo = conn.exec_driver_sql("SELECT is_demo FROM users WHERE id = ?", (user_id,))
    assert is_demo.scalar_one() == 0
    rejected(conn, rows.user, is_demo=2)


# --- reference data ----------------------------------------------------------------------


def test_property_types_reject(conn: Connection) -> None:
    rows.property_type(conn, slug="villa")
    rejected(conn, rows.property_type, slug="villa")
    rejected(conn, rows.property_type, slug=None)
    rejected(conn, rows.property_type, name=None)


def test_amenities_reject(conn: Connection) -> None:
    rows.amenity(conn, slug="wifi")
    rejected(conn, rows.amenity, slug="wifi")
    rejected(conn, rows.amenity, slug=None)
    rejected(conn, rows.amenity, name=None)
    rejected(conn, rows.amenity, category=None)
    rejected(conn, rows.amenity, category="made_up_group")


# --- listings ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bad",
    [
        {"host_id": None},
        {"host_id": 9999},
        {"property_type_id": None},
        {"property_type_id": 9999},
        {"title": None},
        {"title": "  "},
        {"description": None},
        {"description": ""},
        {"city": None},
        {"country": None},
        {"latitude": 91, "longitude": 10},
        {"latitude": 10, "longitude": -181},
        {"latitude": 10},
        {"longitude": 10},
        {"price_per_night_minor": None},
        {"price_per_night_minor": 0},
        {"price_per_night_minor": -100},
        {"cleaning_fee_minor": -1},
        {"max_guests": 0},
        {"bedrooms": -1},
        {"beds": 0},
        {"bathrooms": 0},
        {"created_at": None},
        {"updated_at": None},
    ],
)
def test_listings_reject(conn: Connection, bad: dict[str, Any]) -> None:
    rejected(conn, rows.listing, **bad)


def test_listings_accept_the_edges_and_apply_defaults(conn: Connection) -> None:
    listing_id = rows.listing(conn, bedrooms=0, latitude=-90, longitude=180, state=None)
    row = conn.exec_driver_sql(
        "SELECT cleaning_fee_minor, deleted_at FROM listings WHERE id = ?", (listing_id,)
    ).one()
    assert tuple(row) == (0, None)


def test_listing_images_reject(conn: Connection) -> None:
    listing_id = rows.listing(conn)
    image = {"listing_id": listing_id, "url": "https://example.com/a.jpg", "position": 0}
    rows.insert(conn, "listing_images", image)
    for bad in (
        image,  # the same position twice
        image | {"position": -1},
        image | {"position": 1, "url": None},
        image | {"position": 1, "listing_id": 9999},
    ):
        with pytest.raises(IntegrityError):
            rows.insert(conn, "listing_images", bad)


def test_listing_amenities_reject(conn: Connection) -> None:
    listing_id, amenity_id = rows.listing(conn), rows.amenity(conn)
    link = {"listing_id": listing_id, "amenity_id": amenity_id}
    rows.insert(conn, "listing_amenities", link)
    for bad in (link, link | {"amenity_id": 9999}, link | {"listing_id": 9999}):
        with pytest.raises(IntegrityError):
            rows.insert(conn, "listing_amenities", bad)


# --- bookings ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bad",
    [
        {"confirmation_code": None},
        {"listing_id": None},
        {"listing_id": 9999},
        {"guest_id": None},
        {"guest_id": 9999},
        {"check_in": None},
        {"check_out": None},
        {"check_in": "10/10/2026"},
        {"check_in": "2026-13-45"},
        {"check_out": "2026-10-15T00:00:00"},
        {"check_out": "not a date"},
        {"check_out": "2026-10-10"},  # equal to check-in
        {"check_out": "2026-10-09"},  # before check-in
        {"adults": None},
        {"adults": 0},
        {"children": -1},
        {"infants": -1},
        {"pets": -1},
        {"nightly_price_minor": 0},
        {"cleaning_fee_minor": -1},
        {"service_fee_minor": -1},
        {"total_minor": None},
        {"total_minor": 2_725_400},  # one rupee short of the lines
        {"check_out": "2026-10-14"},  # one night fewer, same total
        {"status": "pending"},
        {"payment_reference": None},
        {"idempotency_key": None},
        {"created_at": None},
    ],
)
def test_bookings_reject(conn: Connection, bad: dict[str, Any]) -> None:
    rejected(conn, rows.booking, **bad)


def test_bookings_apply_defaults(conn: Connection) -> None:
    booking_id = rows.booking(conn)
    row = conn.exec_driver_sql(
        "SELECT children, infants, pets, status FROM bookings WHERE id = ?", (booking_id,)
    ).one()
    assert tuple(row) == (0, 0, 0, "confirmed")


def test_bookings_confirmation_code_is_unique(conn: Connection) -> None:
    rows.booking(conn, confirmation_code="SAME")
    rejected(conn, rows.booking, confirmation_code="SAME")


def test_bookings_idempotency_key_is_unique_per_guest(conn: Connection) -> None:
    guest = rows.user(conn)
    rows.booking(conn, guest_id=guest, idempotency_key="k1")
    rejected(conn, rows.booking, guest_id=guest, idempotency_key="k1")
    rows.booking(conn, idempotency_key="k1")  # another guest may reuse the value


# --- reviews and wishlist ----------------------------------------------------------------


@pytest.mark.parametrize(
    "bad",
    [
        {"booking_id": None},
        {"booking_id": 9999},
        {"rating": None},
        {"rating": 0},
        {"rating": 6},
        {"comment": None},
        {"comment": " "},
        {"created_at": None},
    ],
)
def test_reviews_reject(conn: Connection, bad: dict[str, Any]) -> None:
    rejected(conn, rows.review, **bad)


def test_reviews_one_per_booking(conn: Connection) -> None:
    booking_id = rows.booking(conn)
    rows.review(conn, booking_id=booking_id)
    rejected(conn, rows.review, booking_id=booking_id)


def test_wishlist_items_reject(conn: Connection) -> None:
    item = {"user_id": rows.user(conn), "listing_id": rows.listing(conn), "created_at": rows.NOW}
    rows.insert(conn, "wishlist_items", item)
    for bad in (
        item,
        item | {"user_id": 9999},
        item | {"listing_id": 9999},
        item | {"created_at": None, "listing_id": rows.listing(conn)},
    ):
        with pytest.raises(IntegrityError):
            rows.insert(conn, "wishlist_items", bad)
