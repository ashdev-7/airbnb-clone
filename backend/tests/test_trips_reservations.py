"""Trips, reservation detail and the host's reservations (plan §6.8, §6.10, §10.9)."""

from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db.session import Database
from tests.conftest import Build
from tests.factories import TODAY, login
from tests.test_query_count import counted


def day(offset: int) -> date:
    return TODAY + timedelta(days=offset)


def items(response: Any) -> list[dict[str, Any]]:
    assert response.status_code == 200, response.text
    result: list[dict[str, Any]] = response.json()["items"]
    return result


@pytest.fixture
def world(build: Build) -> dict[str, int]:
    """Two hosts and two guests. Ananya's listing has a past, a current, an upcoming and a
    cancelled stay by Meera and an upcoming one by Arjun; Vikram's has one stay by Meera."""
    with build() as f:
        ananya, vikram = f.user("Ananya"), f.user("Vikram")
        meera, arjun, zoya = f.user("Meera"), f.user("Arjun"), f.user("Zoya")
        villa = f.listing(ananya, title="Ananya's villa")
        cabin = f.listing(ananya, title="Ananya's cabin")
        flat = f.listing(vikram, title="Vikram's flat")
        return {
            "ananya": ananya.id,
            "vikram": vikram.id,
            "meera": meera.id,
            "arjun": arjun.id,
            "zoya": zoya.id,
            "villa": villa.id,
            "cabin": cabin.id,
            "flat": flat.id,
            "past": f.booking(villa, meera, day(-10), nights=3).id,
            "current": f.booking(villa, meera, day(-1), nights=3).id,
            "upcoming": f.booking(villa, meera, day(20), nights=2).id,
            "cancelled": f.booking(villa, meera, day(21), nights=2, status="cancelled").id,
            "arjun_upcoming": f.booking(cabin, arjun, day(5), nights=2).id,
            "at_vikrams": f.booking(flat, meera, day(40), nights=2).id,
        }


# --- trips -------------------------------------------------------------------------------


def test_trips_are_the_callers_bookings_latest_first_with_their_period(
    client: TestClient, world: dict[str, int]
) -> None:
    login(client, world["meera"])
    trips = items(client.get("/api/bookings"))
    assert [(trip["id"], trip["period"]) for trip in trips] == [
        (world["at_vikrams"], "upcoming"),
        (world["cancelled"], "cancelled"),
        (world["upcoming"], "upcoming"),
        (world["current"], "current"),
        (world["past"], "past"),
    ]
    assert trips[0]["listing"]["title"] == "Vikram's flat"
    assert trips[0]["listing"]["host_name"] == "Vikram"
    assert all(trip["guest"]["id"] == world["meera"] for trip in trips)

    login(client, world["zoya"])
    assert items(client.get("/api/bookings")) == []


def test_a_stay_that_checks_out_today_is_past(client: TestClient, build: Build) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        listing = f.listing(host)
        f.booking(listing, guest, day(-2), nights=2)  # checks out today
        f.booking(listing, guest, day(0), nights=1)  # checks in today
    login(client, guest.id)
    assert [trip["period"] for trip in items(client.get("/api/bookings"))] == ["current", "past"]


def test_a_trip_survives_the_removal_of_its_listing(
    client: TestClient, world: dict[str, int], database: Database
) -> None:
    # Vikram's flat has only an upcoming stay, so remove it at the database level here;
    # the API rule that blocks this is tested with the host endpoints.
    with database.engine.connect() as connection:
        connection.exec_driver_sql(
            "UPDATE listings SET deleted_at = '2026-10-01 00:00:00' WHERE id = ?", (world["flat"],)
        )
        connection.commit()

    login(client, world["meera"])
    trip = items(client.get("/api/bookings"))[0]
    assert (trip["listing"]["id"], trip["listing"]["removed"]) == (world["flat"], True)
    assert trip["listing"]["title"] == "Vikram's flat"
    assert client.get(f"/api/bookings/{world['at_vikrams']}").json()["listing"]["removed"] is True


def test_trips_cost_the_same_statements_however_many_there_are(
    client: TestClient, world: dict[str, int], database: Database
) -> None:
    login(client, world["meera"])
    with counted(database) as statements:
        assert len(items(client.get("/api/bookings"))) == 5
    # The signed-in user, the bookings with listing, guest and host, the cover photos.
    assert len(statements) == 3


# --- reservation detail ------------------------------------------------------------------


def test_a_booking_is_visible_to_its_guest_and_the_listings_host_only(
    client: TestClient, world: dict[str, int]
) -> None:
    path = f"/api/bookings/{world['upcoming']}"

    for viewer in ("meera", "ananya"):
        login(client, world[viewer])
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["id"] == world["upcoming"]
        assert response.json()["total_minor"] == 450_000 * 2 + 120_000 + 153_000

    for stranger in ("arjun", "vikram", "zoya"):
        login(client, world[stranger])
        response = client.get(path)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "booking_not_found"

    assert client.get("/api/bookings/9999").json()["error"]["code"] == "booking_not_found"
    client.post("/api/auth/logout")
    assert client.get(path).status_code == 401


# --- the host's reservations -------------------------------------------------------------


def test_a_host_sees_reservations_on_their_own_listings_soonest_first(
    client: TestClient, world: dict[str, int]
) -> None:
    login(client, world["ananya"])
    reservations = items(client.get("/api/hosting/reservations"))
    assert [reservation["id"] for reservation in reservations] == [
        world["past"],
        world["current"],
        world["arjun_upcoming"],
        world["upcoming"],
        world["cancelled"],
    ]
    assert reservations[2]["guest"]["name"] == "Arjun"
    assert reservations[2]["listing"]["title"] == "Ananya's cabin"

    login(client, world["vikram"])
    assert [r["id"] for r in items(client.get("/api/hosting/reservations"))] == [
        world["at_vikrams"]
    ]


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("past", ["past"]),
        ("current", ["current"]),
        ("upcoming", ["arjun_upcoming", "upcoming"]),
        ("cancelled", ["cancelled"]),
    ],
)
def test_reservations_filter_by_status(
    client: TestClient, world: dict[str, int], status: str, expected: list[str]
) -> None:
    login(client, world["ananya"])
    found = items(client.get("/api/hosting/reservations", params={"status": status}))
    assert [reservation["id"] for reservation in found] == [world[name] for name in expected]
    assert all(reservation["period"] == status for reservation in found)


def test_reservations_filter_by_listing(client: TestClient, world: dict[str, int]) -> None:
    login(client, world["ananya"])

    def ids(**params: Any) -> list[int]:
        return [r["id"] for r in items(client.get("/api/hosting/reservations", params=params))]

    assert ids(listing_id=world["cabin"]) == [world["arjun_upcoming"]]
    assert ids(listing_id=world["villa"], status="upcoming") == [world["upcoming"]]
    assert ids(listing_id=world["flat"]) == []  # someone else's listing shows nothing
    assert ids(listing_id=9999) == []
    assert client.get("/api/hosting/reservations", params={"status": "soon"}).status_code == 422


def test_reservations_on_a_removed_listing_stay_visible_and_are_marked(
    client: TestClient, build: Build
) -> None:
    """A host removes a listing once its stays are over; its history must not vanish."""
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        kept, gone = f.listing(host, title="Kept"), f.listing(host, title="Gone")
        on_kept = f.booking(kept, guest, day(5)).id
        on_gone = f.booking(gone, guest, day(-10)).id
    login(client, host.id)
    assert client.delete(f"/api/listings/{gone.id}").status_code == 204

    reservations = items(client.get("/api/hosting/reservations"))
    assert [(r["id"], r["listing"]["title"], r["listing"]["removed"]) for r in reservations] == [
        (on_gone, "Gone", True),
        (on_kept, "Kept", False),
    ]
    by_listing = items(client.get("/api/hosting/reservations", params={"listing_id": gone.id}))
    assert [r["id"] for r in by_listing] == [on_gone]
    assert client.get(f"/api/bookings/{on_gone}").status_code == 200


def test_reservations_work_for_a_user_who_owns_no_listing_now(
    client: TestClient, build: Build
) -> None:
    with build() as f:
        former_host, never_host, guest = f.user("Former"), f.user("Never"), f.user("Guest")
        only = f.listing(former_host)
        old = f.booking(only, guest, day(-10)).id
    login(client, never_host.id)
    assert items(client.get("/api/hosting/reservations")) == []

    login(client, former_host.id)
    client.delete(f"/api/listings/{only.id}")
    assert client.get("/api/auth/me").json()["user"]["is_host"] is False
    assert client.get("/api/hosting/listings").json() == {"items": []}
    assert [r["id"] for r in items(client.get("/api/hosting/reservations"))] == [old]


def test_trips_and_reservations_need_a_session(client: TestClient) -> None:
    for path in ("/api/bookings", "/api/bookings/1", "/api/hosting/reservations"):
        assert client.get(path).status_code == 401
