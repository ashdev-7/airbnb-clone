"""The SQLite engine: connection pragmas (plan §9.1) and control of BEGIN (plan §9.2).

Python's sqlite3 driver decides by itself when to emit BEGIN, and never emits it for a
SELECT. That makes it impossible to open a transaction with the write lock already held.
Following the recipe in SQLAlchemy's SQLite dialect documentation ("Using SQLAlchemy to
emit BEGIN in lieu of SQLite's transaction control"), the driver's own BEGIN is switched
off and SQLAlchemy emits ours instead: DEFERRED by default, IMMEDIATE for connections
that carry the `BEGIN_MODE_OPTION` execution option.
"""

from pathlib import Path
from typing import Any

from sqlalchemy import Connection, Engine, create_engine, event, make_url

BEGIN_MODE_OPTION = "sqlite_begin_mode"
BEGIN_DEFERRED = "DEFERRED"
BEGIN_IMMEDIATE = "IMMEDIATE"


def create_db_engine(database_url: str, busy_timeout_ms: int) -> Engine:
    _ensure_parent_directory(database_url)
    engine = create_engine(database_url)

    @event.listens_for(engine, "connect")
    def configure_connection(dbapi_connection: Any, _record: Any) -> None:
        # Stop the driver emitting BEGIN. COMMIT and ROLLBACK still work as usual.
        dbapi_connection.isolation_level = None
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("PRAGMA synchronous = FULL")
        cursor.execute(f"PRAGMA busy_timeout = {int(busy_timeout_ms)}")
        cursor.close()

    @event.listens_for(engine, "begin")
    def begin_transaction(connection: Connection) -> None:
        mode = connection.get_execution_options().get(BEGIN_MODE_OPTION, BEGIN_DEFERRED)
        connection.exec_driver_sql(f"BEGIN {mode}")

    return engine


def _ensure_parent_directory(database_url: str) -> None:
    """SQLite creates the file but not its folder (`./data` on a fresh clone)."""
    database = make_url(database_url).database
    if database and database != ":memory:":
        Path(database).parent.mkdir(parents=True, exist_ok=True)
