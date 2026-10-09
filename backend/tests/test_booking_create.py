"""Plan §10.3: POST /api/bookings, step by step. Every failing path leaves no row."""

import logging
import re
import uuid
from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.bookings import repository
from app.db.session import Database
from tests.conftest import Build
from tests.factories import NOW, TODAY, book, login

KEY = "0b0f2a55-7f0e-4c58-9d5e-3f6f2f1d9a10"


def day(offset: int) -> date:
    return TODAY + timedelta(days=offset)


def code(response: Any) -> str:
    return str(response.json()["error"]["code"])


def bookings(database: Database) -> int:
    with database.engine.connect() as connection:
        return int(connection.exec_driver_sql("SELECT count(*) FROM bookings").scalar_one())


@pytest.fixture
def stage(client: TestClient, build: Build) -> dict[str, int]:
    """A listing (₹4,500 a night, ₹1,200 cleaning, 4 guests, no pets), its host, and a
    signed-in guest."""
    with build() as f:
        host, guest, other = f.user("Host"), f.user("Meera"), f.user("Arjun")
        listing = f.listing(host)
        ids = {"host": host.id, "guest": guest.id, "other": other.id, "listing": listing.id}
    login(client, guest.id)
    return ids


# --- success (steps 12 and 13) -----------------------------------------------------------


def test_a_booking_is_created_with_a_price_snapshot(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    response = book(client, stage["listing"], day(10), nights=5, adults=2, children=1, infants=1)
    assert response.status_code == 201
    booking = response.json()

    assert re.fullmatch(r"[A-HJ-NP-Z2-9]{10}", booking["confirmation_code"])
    assert (booking["status"], booking["period"]) == ("confirmed", "upcoming")
    assert (booking["check_in"], booking["check_out"]) == (day(10).isoformat(), day(15).isoformat())
    assert (booking["nights"], booking["adults"], booking["children"]) == (5, 2, 1)
    assert (booking["infants"], booking["pets"]) == (1, 0)
    assert (
        booking["nightly_price_minor"],
        booking["nights_total_minor"],
        booking["cleaning_fee_minor"],
        booking["service_fee_minor"],
        booking["total_minor"],
        booking["currency"],
    ) == (450_000, 2_250_000, 120_000, 355_500, 2_725_500, "INR")
    assert booking["guest"] == {"id": stage["guest"], "name": "Meera", "avatar_url": None}
    assert booking["listing"]["id"] == stage["listing"]
    assert booking["listing"]["host_id"] == stage["host"]
    assert booking["listing"]["removed"] is False
    assert booking["listing"]["cover_photo"].endswith("-0.jpg")

    # It is stored, with the gateway's reference, and the dates are now taken for everyone.
    with database.engine.connect() as connection:
        stored = connection.exec_driver_sql(
            "SELECT guest_id, payment_reference, idempotency_key FROM bookings"
        ).one()
    assert stored[0] == stage["guest"] and stored[1].startswith("mock_")
    availability = client.get(f"/api/listings/{stage['listing']}/availability").json()
    assert availability["booked"] == [
        {"check_in": day(10).isoformat(), "check_out": day(15).isoformat()}
    ]


def test_every_step_is_logged(
    client: TestClient, stage: dict[str, int], caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="app.bookings"):
        book(client, stage["listing"], day(10))
    lines = [record.getMessage() for record in caplog.records if record.name == "app.bookings"]
    for step in (
        "step 3",
        "step 4",
        "step 5",
        "step 6",
        "steps 7-9",
        "step 10",
        "step 11",
        "step 12",
    ):
        assert any(step in line for line in lines), step
    steps = [record for record in caplog.records if record.name == "app.bookings"]
    assert len({record.request_id for record in steps}) == 1  # type: ignore[attr-defined]


# --- step 1: identity --------------------------------------------------------------------


def test_step_1_signed_out_is_401(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    client.post("/api/auth/logout")
    response = book(client, stage["listing"], day(10), expected_total_minor=1_155_000)
    assert (response.status_code, code(response)) == (401, "unauthenticated")
    assert bookings(database) == 0


def test_the_body_cannot_choose_the_guest(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    response = book(client, stage["listing"], day(10), guest_id=stage["other"])
    assert (response.status_code, code(response)) == (422, "validation_error")
    assert bookings(database) == 0


# --- step 2: shape -----------------------------------------------------------------------


def test_step_2_the_idempotency_key_is_required_and_must_be_a_uuid(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    body = {
        "listing_id": stage["listing"],
        "check_in": day(10).isoformat(),
        "check_out": day(12).isoformat(),
        "adults": 2,
        "payment_method": "demo_card_ok",
        "expected_total_minor": 1_173_000,
    }
    missing = client.post("/api/bookings", json=body)
    malformed = client.post("/api/bookings", json=body, headers={"Idempotency-Key": "abc"})
    for response in (missing, malformed):
        assert (response.status_code, code(response)) == (422, "validation_error")
        assert "idempotency-key" in response.json()["error"]["details"]["fields"][0]["path"]
    assert bookings(database) == 0


@pytest.mark.parametrize(
    "change",
    [
        {"listing_id": None},
        {"check_in": "soon"},
        {"check_out": None},
        {"adults": "two"},
        {"payment_method": "real_card"},
        {"payment_method": None},
        {"expected_total_minor": "a lot"},
        {"card_number": "4111111111111111"},  # no such field exists
    ],
)
def test_step_2_malformed_bodies_are_422(
    client: TestClient, stage: dict[str, int], database: Database, change: dict[str, Any]
) -> None:
    response = book(client, stage["listing"], day(10), **({"expected_total_minor": 1} | change))
    assert (response.status_code, code(response)) == (422, "validation_error")
    assert bookings(database) == 0


# --- step 4: idempotency -----------------------------------------------------------------


def test_step_4_the_same_request_again_returns_the_first_booking(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    first = book(client, stage["listing"], day(10), key=KEY)
    again = book(
        client, stage["listing"], day(10), key=KEY, expected_total_minor=first.json()["total_minor"]
    )
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json() == first.json()
    assert bookings(database) == 1


@pytest.mark.parametrize(
    "difference", [{"nights": 3}, {"adults": 1}, {"infants": 1}, {"check_in_offset": 20}]
)
def test_step_4_a_key_reused_for_a_different_request_is_refused(
    client: TestClient, stage: dict[str, int], database: Database, difference: dict[str, int]
) -> None:
    book(client, stage["listing"], day(10), key=KEY)
    check_in = day(difference.pop("check_in_offset", 10))
    response = book(client, stage["listing"], check_in, key=KEY, **difference)
    assert (response.status_code, code(response)) == (422, "idempotency_key_reused")
    assert bookings(database) == 1


def test_step_4_keys_belong_to_their_guest(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    assert book(client, stage["listing"], day(10), key=KEY).status_code == 201
    login(client, stage["other"])
    assert book(client, stage["listing"], day(20), key=KEY).status_code == 201
    assert bookings(database) == 2


# --- steps 5 and 6: the listing ----------------------------------------------------------


def test_step_5_unknown_and_removed_listings_are_404(
    client: TestClient, stage: dict[str, int], build: Build, database: Database
) -> None:
    with build() as f:
        removed = f.listing(f.user("Other host"), deleted_at=NOW).id
    for missing in (removed, 9999):
        response = book(client, missing, day(10))
        assert (response.status_code, code(response)) == (404, "listing_not_found")
    assert bookings(database) == 0


def test_step_6_a_host_cannot_book_their_own_listing(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    login(client, stage["host"])
    response = book(client, stage["listing"], day(10))
    assert (response.status_code, code(response)) == (403, "cannot_book_own_listing")
    assert bookings(database) == 0


# --- steps 7 and 8: dates and guests -----------------------------------------------------


@pytest.mark.parametrize(
    ("start", "nights"), [(10, 0), (10, -2), (-2, 2), (-30, 2), (729, 2), (800, 2)]
)
def test_step_7_invalid_dates_are_422(
    client: TestClient, stage: dict[str, int], database: Database, start: int, nights: int
) -> None:
    response = book(client, stage["listing"], day(start), nights)
    assert (response.status_code, code(response)) == (422, "invalid_dates")
    assert bookings(database) == 0


@pytest.mark.parametrize(
    "guests",
    [
        {"adults": 0},
        {"adults": -1},
        {"adults": 5},
        {"adults": 3, "children": 2},
        {"adults": 2, "children": -1},
        {"adults": 2, "infants": 6},
        {"adults": 2, "pets": 1},
    ],
)
def test_step_8_invalid_guests_are_422(
    client: TestClient, stage: dict[str, int], database: Database, guests: dict[str, Any]
) -> None:
    response = book(client, stage["listing"], day(10), **guests)
    assert (response.status_code, code(response)) == (422, "invalid_guest_count")
    assert bookings(database) == 0


def test_step_8_a_full_house_with_infants_is_fine(
    client: TestClient, stage: dict[str, int]
) -> None:
    assert (
        book(client, stage["listing"], day(10), adults=2, children=2, infants=5).status_code == 201
    )


# --- step 9: availability (the table of plan §10.1; existing stay: day 10 to day 15) ------


@pytest.fixture
def booked(client: TestClient, stage: dict[str, int]) -> dict[str, int]:
    assert book(client, stage["listing"], day(10), nights=5).status_code == 201
    login(client, stage["other"])
    return stage


@pytest.mark.parametrize(("start", "nights"), [(15, 5), (5, 5)])
def test_step_9_stays_that_only_touch_are_allowed(
    client: TestClient, booked: dict[str, int], start: int, nights: int
) -> None:
    assert book(client, booked["listing"], day(start), nights).status_code == 201


@pytest.mark.parametrize(("start", "nights"), [(14, 2), (9, 2), (11, 2), (8, 10), (10, 5)])
def test_step_9_overlapping_stays_are_409(
    client: TestClient, booked: dict[str, int], database: Database, start: int, nights: int
) -> None:
    response = book(client, booked["listing"], day(start), nights, expected_total_minor=1)
    assert (response.status_code, code(response)) == (409, "dates_unavailable")
    assert bookings(database) == 1


def test_step_9_the_trigger_is_the_backstop_if_the_check_is_bypassed(
    client: TestClient,
    booked: dict[str, int],
    database: Database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Pretend the service's own check found nothing: the database still refuses."""
    total = 450_000 * 2 + 120_000 + 153_000
    monkeypatch.setattr(repository, "has_conflict", lambda *_args: False)
    response = book(client, booked["listing"], day(11), nights=2, expected_total_minor=total)
    assert (response.status_code, code(response)) == (409, "dates_unavailable")
    assert bookings(database) == 1


# --- step 10: the price ------------------------------------------------------------------


def test_step_10_a_wrong_total_is_refused_with_the_real_quote(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    response = book(client, stage["listing"], day(10), nights=5, expected_total_minor=100)
    assert (response.status_code, code(response)) == (409, "price_changed")
    quote = response.json()["error"]["details"]["quote"]
    assert (quote["total_minor"], quote["nights"], quote["service_fee_minor"]) == (
        2_725_500,
        5,
        355_500,
    )
    assert bookings(database) == 0


def test_step_10_a_price_changed_by_the_host_must_be_confirmed_again(
    client: TestClient, stage: dict[str, int]
) -> None:
    seen = client.get(
        f"/api/listings/{stage['listing']}/quote",
        params={"check_in": day(10).isoformat(), "check_out": day(12).isoformat()},
    ).json()["total_minor"]

    login(client, stage["host"])
    client.patch(f"/api/listings/{stage['listing']}", json={"price_per_night_minor": 500_000})
    login(client, stage["guest"])

    stale = book(client, stage["listing"], day(10), key=KEY, expected_total_minor=seen)
    assert (stale.status_code, code(stale)) == (409, "price_changed")
    new_total = stale.json()["error"]["details"]["quote"]["total_minor"]
    assert new_total != seen

    confirmed = book(client, stage["listing"], day(10), key=KEY, expected_total_minor=new_total)
    assert confirmed.status_code == 201
    assert confirmed.json()["nightly_price_minor"] == 500_000


# --- step 11: payment --------------------------------------------------------------------


def test_step_11_a_declined_payment_books_nothing_and_frees_the_key(
    client: TestClient, stage: dict[str, int], database: Database
) -> None:
    declined = book(client, stage["listing"], day(10), key=KEY, payment_method="demo_card_declined")
    assert (declined.status_code, code(declined)) == (402, "payment_declined")
    assert bookings(database) == 0
    assert client.get(f"/api/listings/{stage['listing']}/availability").json()["booked"] == []

    # Nothing was kept, so the guest can pay with the other card on the same page.
    assert book(client, stage["listing"], day(10), key=KEY).status_code == 201
    assert bookings(database) == 1


def test_the_gateway_is_charged_the_servers_total_once(
    client: TestClient, stage: dict[str, int], app: Any
) -> None:
    from app.bookings.payment import get_payment_gateway

    charges: list[tuple[int, str]] = []

    class Recorder:
        def charge(self, amount_minor: int, method: str) -> str:
            charges.append((amount_minor, method))
            return "recorded"

    app.dependency_overrides[get_payment_gateway] = Recorder
    book(client, stage["listing"], day(10), nights=5)
    book(client, stage["listing"], day(10), nights=5, expected_total_minor=1)  # dates now taken
    book(client, stage["listing"], day(30), nights=5, expected_total_minor=1)  # wrong total
    assert charges == [(2_725_500, "demo_card_ok")]


def test_a_fresh_key_is_needed_for_each_new_booking(
    client: TestClient, stage: dict[str, int]
) -> None:
    keys = {str(uuid.uuid4()) for _ in range(3)}
    for offset, key in zip((10, 20, 30), keys, strict=True):
        assert book(client, stage["listing"], day(offset), key=key).status_code == 201
    assert len(client.get("/api/bookings").json()["items"]) == 3
