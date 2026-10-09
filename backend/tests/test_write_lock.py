"""Plan §9.2 and risk 2: prove that we, not the sqlite3 driver, control BEGIN.

A write session must hold SQLite's single write lock from its first moment, a second
writer must wait for it, and a writer that cannot get the lock in time must get 503.
"""

import sqlite3
import threading
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import Database
from tests.conftest import AppFactory


def _count(db_path: Path) -> int:
    with sqlite3.connect(db_path) as connection:
        row = connection.execute("SELECT count(*) FROM probe").fetchone()
    return int(row[0])


def test_write_session_takes_the_write_lock_before_any_statement(
    database: Database, other_connection: sqlite3.Connection
) -> None:
    with (
        database.write_session(),
        pytest.raises(sqlite3.OperationalError, match="database is locked"),
    ):
        other_connection.execute("BEGIN IMMEDIATE")
    # Released on exit.
    other_connection.execute("BEGIN IMMEDIATE")
    other_connection.execute("ROLLBACK")


def test_read_session_does_not_take_the_write_lock(
    database: Database, other_connection: sqlite3.Connection
) -> None:
    with database.read_session() as session:
        session.execute(text("SELECT count(*) FROM probe")).scalar_one()
        other_connection.execute("BEGIN IMMEDIATE")
        other_connection.execute("ROLLBACK")


def test_read_session_sees_a_stable_snapshot(
    database: Database, other_connection: sqlite3.Connection
) -> None:
    """A deferred BEGIN is emitted for reads, so a commit made meanwhile stays invisible."""
    with database.read_session() as session:
        assert session.execute(text("SELECT count(*) FROM probe")).scalar_one() == 0
        other_connection.execute("INSERT INTO probe (note) VALUES ('committed meanwhile')")
        assert session.execute(text("SELECT count(*) FROM probe")).scalar_one() == 0
    with database.read_session() as session:
        assert session.execute(text("SELECT count(*) FROM probe")).scalar_one() == 1


def test_write_session_commits_on_success(database: Database, db_path: Path) -> None:
    with database.write_session() as session:
        session.execute(text("INSERT INTO probe (note) VALUES ('kept')"))
    assert _count(db_path) == 1


def test_write_session_rolls_back_on_exception(database: Database, db_path: Path) -> None:
    with pytest.raises(RuntimeError), database.write_session() as session:
        session.execute(text("INSERT INTO probe (note) VALUES ('discarded')"))
        raise RuntimeError("fail after the insert")
    assert _count(db_path) == 0


def test_failed_request_leaves_no_row(client: TestClient, db_path: Path) -> None:
    assert client.post("/api/_test/write-then-fail").status_code == 500
    assert _count(db_path) == 0


def test_successful_request_is_committed_when_the_response_arrives(
    client: TestClient, db_path: Path
) -> None:
    assert client.post("/api/_test/write").status_code == 201
    assert _count(db_path) == 1


def test_second_writer_waits_for_the_first_then_succeeds(
    client: TestClient, other_connection: sqlite3.Connection, db_path: Path
) -> None:
    hold_seconds = 0.5
    other_connection.execute("BEGIN IMMEDIATE")
    release = threading.Timer(hold_seconds, lambda: other_connection.execute("COMMIT"))
    release.start()
    try:
        started = time.monotonic()
        response = client.post("/api/_test/write")
        waited = time.monotonic() - started
    finally:
        release.join()

    assert response.status_code == 201
    assert waited >= hold_seconds * 0.8
    assert _count(db_path) == 1


def test_second_writer_gets_503_busy_after_the_timeout(make_app: AppFactory, db_path: Path) -> None:
    timeout_ms = 300
    app = make_app(sqlite_busy_timeout_ms=timeout_ms)
    holder = sqlite3.connect(db_path, timeout=0, isolation_level=None)
    holder.execute("BEGIN IMMEDIATE")
    try:
        with TestClient(app) as client:
            started = time.monotonic()
            response = client.post("/api/_test/write")
            waited = time.monotonic() - started
    finally:
        holder.execute("ROLLBACK")
        holder.close()

    assert response.status_code == 503
    assert response.headers["Retry-After"] == "1"
    error = response.json()["error"]
    assert error["code"] == "busy"
    assert error["request_id"] == response.headers["X-Request-ID"]
    assert waited >= timeout_ms / 1000 * 0.8
    assert _count(db_path) == 0


def test_readers_are_not_blocked_by_a_writer(
    client: TestClient, other_connection: sqlite3.Connection
) -> None:
    other_connection.execute("BEGIN IMMEDIATE")
    other_connection.execute("INSERT INTO probe (note) VALUES ('uncommitted')")
    try:
        started = time.monotonic()
        response = client.get("/api/_test/count")
        waited = time.monotonic() - started
    finally:
        other_connection.execute("ROLLBACK")

    assert response.status_code == 200
    assert response.json() == {"count": 0}
    assert waited < 1
