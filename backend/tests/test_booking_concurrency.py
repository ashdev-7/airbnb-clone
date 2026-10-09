"""Plan §9.3 rows 1 and 2, §13: simultaneous requests cannot double book, and a repeated
request cannot book twice. Each thread uses its own client, as separate browsers would.

A request is only a few milliseconds long, so threads alone rarely collide. The payment
gateway used here pauses in the middle of the booking, after the availability check and
before the insert, which keeps every request inside its transaction at the same time.
Without BEGIN IMMEDIATE these tests fail: every request passes the check before any
has written.
"""

import threading
import time
import uuid
from collections import Counter
from datetime import timedelta
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.bookings.payment import get_payment_gateway
from tests.conftest import Build
from tests.factories import TODAY, login

THREADS = 8
PAUSE_SECONDS = 0.05
CHECK_IN = TODAY + timedelta(days=10)
CHECK_OUT = TODAY + timedelta(days=13)
TOTAL = 450_000 * 3 + 120_000 + 220_500  # three nights, cleaning, 15% service fee


def body(listing_id: int) -> dict[str, Any]:
    return {
        "listing_id": listing_id,
        "check_in": CHECK_IN.isoformat(),
        "check_out": CHECK_OUT.isoformat(),
        "adults": 2,
        "payment_method": "demo_card_ok",
        "expected_total_minor": TOTAL,
    }


class SlowGateway:
    def charge(self, amount_minor: int, method: str) -> str:
        time.sleep(PAUSE_SECONDS)
        return f"slow_{uuid.uuid4().hex}"


def fire(app: FastAPI, requests: list[tuple[int, str, dict[str, Any]]]) -> list[Any]:
    """Send every (user id, idempotency key, body) at the same moment, one thread each."""
    app.dependency_overrides[get_payment_gateway] = SlowGateway
    clients = []
    for user_id, _, _ in requests:
        client = TestClient(app)
        login(client, user_id)
        clients.append(client)

    start = threading.Barrier(len(requests))
    responses: list[Any] = [None] * len(requests)

    def send(index: int) -> None:
        _, key, payload = requests[index]
        start.wait()
        responses[index] = clients[index].post(
            "/api/bookings", json=payload, headers={"Idempotency-Key": key}
        )

    threads = [threading.Thread(target=send, args=(index,)) for index in range(len(requests))]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=60)
    assert all(response is not None for response in responses)
    return responses


def stored(db_path: Path) -> list[tuple[Any, ...]]:
    import sqlite3

    with sqlite3.connect(db_path) as connection:
        return connection.execute("SELECT id, guest_id, status FROM bookings").fetchall()


def test_eight_guests_booking_the_same_dates_at_once_get_one_booking(
    app: FastAPI, build: Build, db_path: Path
) -> None:
    with build() as f:
        listing = f.listing(f.user("Host"))
        guests = [f.user(f"Guest {number}") for number in range(THREADS)]

    responses = fire(app, [(guest.id, str(uuid.uuid4()), body(listing.id)) for guest in guests])

    assert Counter(response.status_code for response in responses) == {201: 1, 409: THREADS - 1}
    losers = [response for response in responses if response.status_code == 409]
    assert {response.json()["error"]["code"] for response in losers} == {"dates_unavailable"}
    rows = stored(db_path)
    assert len(rows) == 1
    winner = next(response for response in responses if response.status_code == 201)
    assert rows[0][1] == winner.json()["guest"]["id"]


def test_the_same_request_sent_eight_times_at_once_makes_one_booking(
    app: FastAPI, build: Build, db_path: Path
) -> None:
    """A double click or a network retry: every copy carries the same idempotency key."""
    with build() as f:
        listing = f.listing(f.user("Host"))
        guest = f.user("Guest")
    key = str(uuid.uuid4())

    responses = fire(app, [(guest.id, key, body(listing.id))] * THREADS)

    assert Counter(response.status_code for response in responses) == {201: 1, 200: THREADS - 1}
    assert len({response.json()["id"] for response in responses}) == 1
    assert len({response.json()["confirmation_code"] for response in responses}) == 1
    assert len(stored(db_path)) == 1


def test_back_to_back_stays_booked_at_once_both_succeed(
    app: FastAPI, build: Build, db_path: Path
) -> None:
    with build() as f:
        listing = f.listing(f.user("Host"))
        first, second = f.user("First"), f.user("Second")
    later = body(listing.id) | {
        "check_in": CHECK_OUT.isoformat(),
        "check_out": (CHECK_OUT + timedelta(days=3)).isoformat(),
    }

    responses = fire(
        app,
        [
            (first.id, str(uuid.uuid4()), body(listing.id)),
            (second.id, str(uuid.uuid4()), later),
        ],
    )

    assert [response.status_code for response in responses] == [201, 201]
    assert len(stored(db_path)) == 2
