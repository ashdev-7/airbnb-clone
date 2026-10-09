"""Plan §9.1: the connection settings every other guarantee rests on."""

from sqlalchemy import text

from app.db.session import Database

EXPECTED = {
    "journal_mode": "wal",
    "foreign_keys": 1,
    "synchronous": 2,  # FULL
    "busy_timeout": 5000,
}


def test_pragmas_are_set_on_read_sessions(database: Database) -> None:
    with database.read_session() as session:
        for pragma, expected in EXPECTED.items():
            assert session.execute(text(f"PRAGMA {pragma}")).scalar_one() == expected, pragma


def test_pragmas_are_set_on_write_sessions(database: Database) -> None:
    with database.write_session() as session:
        for pragma, expected in EXPECTED.items():
            assert session.execute(text(f"PRAGMA {pragma}")).scalar_one() == expected, pragma


def test_pragmas_are_set_on_every_pooled_connection(database: Database) -> None:
    with database.engine.connect() as first, database.engine.connect() as second:
        for connection in (first, second):
            assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar_one() == 1
            assert connection.exec_driver_sql("PRAGMA busy_timeout").scalar_one() == 5000
