"""Raw-SQL row builders for the database tests.

The tests insert with plain SQL, not through the models, because the point is to prove
that the database itself refuses bad rows whoever writes them. Each builder inserts a
valid row; a test overrides the one column it wants to break.
"""

from typing import Any

from sqlalchemy import Connection

NOW = "2026-01-01 00:00:00"


def insert(connection: Connection, table: str, values: dict[str, Any]) -> int:
    columns = ", ".join(values)
    placeholders = ", ".join("?" for _ in values)
    result = connection.exec_driver_sql(
        f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", tuple(values.values())
    )
    return int(result.lastrowid or 0)


def user(connection: Connection, **overrides: Any) -> int:
    count = connection.exec_driver_sql("SELECT count(*) FROM users").scalar_one()
    values = {"name": "Asha", "email": f"user{count}@example.com", "created_at": NOW}
    return insert(connection, "users", values | overrides)


def property_type(connection: Connection, **overrides: Any) -> int:
    count = connection.exec_driver_sql("SELECT count(*) FROM property_types").scalar_one()
    values = {"slug": f"type-{count}", "name": "Villa"}
    return insert(connection, "property_types", values | overrides)


def amenity(connection: Connection, **overrides: Any) -> int:
    count = connection.exec_driver_sql("SELECT count(*) FROM amenities").scalar_one()
    values = {"slug": f"amenity-{count}", "name": "Wifi", "category": "internet_office"}
    return insert(connection, "amenities", values | overrides)


def listing(connection: Connection, **overrides: Any) -> int:
    values = {
        "title": "Quiet villa",
        "description": "A place to stay.",
        "city": "Jaipur",
        "country": "India",
        "price_per_night_minor": 450_000,
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "bathrooms": 1,
        "created_at": NOW,
        "updated_at": NOW,
    }
    values |= overrides
    if "host_id" not in values:
        values["host_id"] = user(connection)
    if "property_type_id" not in values:
        values["property_type_id"] = property_type(connection)
    return insert(connection, "listings", values)


def booking(connection: Connection, **overrides: Any) -> int:
    """A valid five-night stay, 10 → 15 October 2026: ₹4,500 × 5 + ₹1,200 + ₹3,555."""
    count = connection.exec_driver_sql("SELECT count(*) FROM bookings").scalar_one()
    values = {
        "confirmation_code": f"CODE{count:06d}",
        "check_in": "2026-10-10",
        "check_out": "2026-10-15",
        "adults": 2,
        "nightly_price_minor": 450_000,
        "cleaning_fee_minor": 120_000,
        "service_fee_minor": 355_500,
        "total_minor": 2_725_500,
        "payment_reference": "pay_test",
        "idempotency_key": f"key-{count}",
        "created_at": NOW,
    }
    values |= overrides
    if "listing_id" not in values:
        values["listing_id"] = listing(connection)
    if "guest_id" not in values:
        values["guest_id"] = user(connection)
    return insert(connection, "bookings", values)


def review(connection: Connection, **overrides: Any) -> int:
    values = {"rating": 5, "comment": "Lovely stay.", "created_at": NOW}
    values |= overrides
    if "booking_id" not in values:
        values["booking_id"] = booking(connection)
    return insert(connection, "reviews", values)
