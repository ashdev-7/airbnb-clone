"""The one definition of "two stays overlap" (plan §10.1).

A stay is the half-open interval [check_in, check_out): the guest leaves on the morning
of check_out, so another stay may start that day. Two stays overlap exactly when each
starts before the other ends. Only confirmed bookings block dates.

The rule is written here twice, once for Python and once as the SQL the database
triggers run, so the two can be read side by side.
"""

from datetime import date, timedelta
from typing import Any

from sqlalchemy import ColumnElement, and_

# Airbnb allows booking "up to 2 years in advance" (REF-A1).
MAX_ADVANCE_DAYS = 730
# The server accepts a check-in from one day before its own today, so a visitor in a
# timezone behind India can still book their local today (plan §10.1).
CHECK_IN_GRACE_DAYS = 1


def overlaps(a_check_in: date, a_check_out: date, b_check_in: date, b_check_out: date) -> bool:
    return a_check_in < b_check_out and b_check_in < a_check_out


def overlap_condition(
    existing_check_in: Any, existing_check_out: Any, check_in: date, check_out: date
) -> ColumnElement[bool]:
    """`overlaps` as a SQL condition on a table's date columns, for queries."""
    return and_(existing_check_in < check_out, check_in < existing_check_out)


def last_bookable_day(today: date) -> date:
    return today + timedelta(days=MAX_ADVANCE_DAYS)


def stay_error(check_in: date, check_out: date, today: date) -> str | None:
    """Why these dates cannot be booked, or None when they can (plan §10.1): at least one
    night, not in the past, and no further ahead than the booking window."""
    if check_out <= check_in:
        return "Check-out must be after check-in."
    if check_in < today - timedelta(days=CHECK_IN_GRACE_DAYS):
        return "Check-in cannot be in the past."
    if check_out > last_bookable_day(today):
        return f"Stays can be booked up to {MAX_ADVANCE_DAYS} days ahead."
    return None


# The same test in the triggers, between an existing row `b` and the row being written, `NEW`.
_OVERLAP_SQL = """
    b.listing_id = NEW.listing_id
      AND b.status = 'confirmed'
      AND b.check_in < NEW.check_out
      AND NEW.check_in < b.check_out
"""

OVERLAP_ERROR = "booking_overlap"

# The database's own guarantee (plan §8.3). SQLite allows one writer at a time, so the
# check and the write it guards cannot interleave with another write.
NO_OVERLAP_INSERT_TRIGGER = f"""
CREATE TRIGGER bookings_no_overlap_insert
BEFORE INSERT ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
  SELECT RAISE(ABORT, '{OVERLAP_ERROR}')
  WHERE EXISTS (
    SELECT 1 FROM bookings b
    WHERE {_OVERLAP_SQL}
  );
END
"""

NO_OVERLAP_UPDATE_TRIGGER = f"""
CREATE TRIGGER bookings_no_overlap_update
BEFORE UPDATE OF listing_id, check_in, check_out, status ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
  SELECT RAISE(ABORT, '{OVERLAP_ERROR}')
  WHERE EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id <> NEW.id
      AND {_OVERLAP_SQL}
  );
END
"""
