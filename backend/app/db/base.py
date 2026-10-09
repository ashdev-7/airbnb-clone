"""Declarative base that every model inherits from. Tables arrive in Phase 2."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
