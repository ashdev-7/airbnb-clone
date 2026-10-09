"""Declarative base, constraint naming and the UTC datetime column type."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, MetaData, Text
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator

# Every constraint and index gets a predictable name, so an error names the rule it broke.
NAMING_CONVENTION = {
    "pk": "pk_%(table_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
}


class UtcDateTime(TypeDecorator[datetime]):
    """A moment in time, always UTC. SQLite has no timezone type, so the value is stored
    without one; this type refuses naive datetimes on the way in and returns aware ones."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("A timezone-aware datetime is required")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: Any | None, dialect: Dialect) -> datetime | None:
        return None if value is None else value.replace(tzinfo=UTC)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    type_annotation_map = {str: Text}
