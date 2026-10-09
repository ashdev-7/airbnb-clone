"""Read and write units of work (plan §9.2).

A read session runs in a deferred transaction: a consistent snapshot that never blocks
and is never blocked. A write session opens with BEGIN IMMEDIATE, so it holds SQLite's
single write lock before it reads anything; it commits on success and rolls back on any
exception.
"""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core.errors import AppError
from app.db.engine import BEGIN_IMMEDIATE, BEGIN_MODE_OPTION


class Database:
    def __init__(self, engine: Engine) -> None:
        self.engine = engine
        self._read_sessions = sessionmaker(bind=engine)
        # Same connection pool; only the BEGIN statement differs. Objects stay readable
        # after the commit, so a response can be built from what was just written.
        self._write_sessions = sessionmaker(
            bind=engine.execution_options(**{BEGIN_MODE_OPTION: BEGIN_IMMEDIATE}),
            expire_on_commit=False,
        )

    @contextmanager
    def read_session(self) -> Iterator[Session]:
        with self._read_sessions() as session:
            yield session

    @contextmanager
    def write_session(self) -> Iterator[Session]:
        with self._write_sessions() as session:
            try:
                # Begin now rather than at the first query: the lock comes first.
                session.connection()
            except OperationalError as exc:
                if _is_locked(exc):
                    raise _busy() from exc
                raise
            try:
                yield session
                session.commit()
            except BaseException:
                session.rollback()
                raise


def _is_locked(exc: OperationalError) -> bool:
    return "database is locked" in str(exc.orig)


def _busy() -> AppError:
    """The write lock was not obtained within the busy timeout (plan §9.3 row 9)."""
    return AppError(
        "busy", 503, "The service is busy. Please try again.", headers={"Retry-After": "1"}
    )
