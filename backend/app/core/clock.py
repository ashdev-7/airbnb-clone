"""Today's date for the business (plan §10.1): the calendar date in APP_TIMEZONE.

The only place the current date is read. Callers take the date as a value, so tests and
the seed can supply any day they like.
"""

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo


def today(timezone_name: str, now: datetime | None = None) -> date:
    """The date in `timezone_name` at the instant `now` (default: this instant)."""
    instant = now if now is not None else datetime.now(UTC)
    return instant.astimezone(ZoneInfo(timezone_name)).date()
