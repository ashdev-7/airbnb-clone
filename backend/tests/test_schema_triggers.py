"""Plan §8.3: the database itself refuses a double booking, even from raw SQL."""

from collections.abc import Iterator

import pytest
from sqlalchemy import Connection
from sqlalchemy.exc import IntegrityError

from app.db.session import Database
from tests import db_rows as rows

# The fixture table of plan §10.1, against an existing stay 10 → 15 October.
ALLOWED = [("2026-10-15", "2026-10-20"), ("2026-10-05", "2026-10-10")]
CONFLICTS = [
    ("2026-10-14", "2026-10-16"),
    ("2026-10-09", "2026-10-11"),
    ("2026-10-11", "2026-10-13"),
    ("2026-10-08", "2026-10-18"),
]


def stay(check_in: str, check_out: str) -> dict[str, object]:
    """Dates plus money that adds up for them (₹1,000 a night, no fees)."""
    nights = int(check_out[-2:]) - int(check_in[-2:])
    return {
        "check_in": check_in,
        "check_out": check_out,
        "nightly_price_minor": 100_000,
        "cleaning_fee_minor": 0,
        "service_fee_minor": 0,
        "total_minor": 100_000 * nights,
    }


@pytest.fixture
def conn(database: Database) -> Iterator[Connection]:
    with database.engine.connect() as connection:
        yield connection


@pytest.fixture
def listing_id(conn: Connection) -> int:
    """A listing with one confirmed stay, 10 → 15 October."""
    listing = rows.listing(conn)
    rows.booking(conn, listing_id=listing, **stay("2026-10-10", "2026-10-15"))
    return listing


@pytest.mark.parametrize(("check_in", "check_out"), ALLOWED)
def test_insert_allows_stays_that_only_touch(
    conn: Connection, listing_id: int, check_in: str, check_out: str
) -> None:
    rows.booking(conn, listing_id=listing_id, **stay(check_in, check_out))


@pytest.mark.parametrize(("check_in", "check_out"), CONFLICTS)
def test_insert_rejects_overlapping_stays(
    conn: Connection, listing_id: int, check_in: str, check_out: str
) -> None:
    with pytest.raises(IntegrityError, match="booking_overlap"):
        rows.booking(conn, listing_id=listing_id, **stay(check_in, check_out))


def test_cancelled_rows_neither_block_nor_are_blocked(conn: Connection, listing_id: int) -> None:
    overlapping = stay("2026-10-11", "2026-10-13")
    rows.booking(conn, listing_id=listing_id, status="cancelled", **overlapping)

    other_listing = rows.listing(conn)
    rows.booking(conn, listing_id=other_listing, status="cancelled", **overlapping)
    rows.booking(conn, listing_id=other_listing, **overlapping)


def test_another_listing_is_not_affected(conn: Connection, listing_id: int) -> None:
    rows.booking(conn, listing_id=rows.listing(conn), **stay("2026-10-10", "2026-10-15"))


def test_update_rejects_moving_dates_into_a_conflict(conn: Connection, listing_id: int) -> None:
    later = rows.booking(conn, listing_id=listing_id, **stay("2026-10-20", "2026-10-22"))
    with pytest.raises(IntegrityError, match="booking_overlap"):
        conn.exec_driver_sql(
            "UPDATE bookings SET check_in = '2026-10-13', check_out = '2026-10-15' WHERE id = ?",
            (later,),
        )


def test_update_rejects_moving_a_stay_onto_a_booked_listing(
    conn: Connection, listing_id: int
) -> None:
    elsewhere = rows.booking(conn, **stay("2026-10-12", "2026-10-14"))
    with pytest.raises(IntegrityError, match="booking_overlap"):
        conn.exec_driver_sql(
            "UPDATE bookings SET listing_id = ? WHERE id = ?", (listing_id, elsewhere)
        )


def test_update_rejects_confirming_a_cancelled_stay_that_now_conflicts(
    conn: Connection, listing_id: int
) -> None:
    cancelled = rows.booking(
        conn, listing_id=listing_id, status="cancelled", **stay("2026-10-11", "2026-10-13")
    )
    with pytest.raises(IntegrityError, match="booking_overlap"):
        conn.exec_driver_sql("UPDATE bookings SET status = 'confirmed' WHERE id = ?", (cancelled,))


def test_update_does_not_conflict_with_the_row_itself(conn: Connection, listing_id: int) -> None:
    booking_id = conn.exec_driver_sql(
        "SELECT id FROM bookings WHERE listing_id = ?", (listing_id,)
    ).scalar_one()
    # Shorten the stay by a day: it overlaps its own old dates and nothing else.
    conn.exec_driver_sql(
        "UPDATE bookings SET check_out = '2026-10-14', total_minor = 400000 WHERE id = ?",
        (booking_id,),
    )
    conn.exec_driver_sql("UPDATE bookings SET adults = 3 WHERE id = ?", (booking_id,))


def test_cancelling_frees_the_dates(conn: Connection, listing_id: int) -> None:
    conn.exec_driver_sql(
        "UPDATE bookings SET status = 'cancelled' WHERE listing_id = ?", (listing_id,)
    )
    rows.booking(conn, listing_id=listing_id, **stay("2026-10-11", "2026-10-13"))
