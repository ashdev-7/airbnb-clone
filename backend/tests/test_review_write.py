"""Writing a review after a stay, and reading your own (plan §10.7 bonus B2, §6.15)."""

from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import Build
from tests.factories import TODAY, login


def day(offset: int) -> date:
    return TODAY + timedelta(days=offset)


GOOD = {"rating": 4, "comment": "  Quiet, clean and close to the lake.  "}


@pytest.fixture
def world(build: Build) -> dict[str, int]:
    """Meera stayed at Ananya's villa: one stay just ended, one long ago, one still ahead."""
    with build() as f:
        ananya, meera, arjun = f.user("Ananya"), f.user("Meera"), f.user("Arjun")
        villa = f.listing(ananya, title="Ananya's villa")
        return {
            "ananya": ananya.id,
            "meera": meera.id,
            "arjun": arjun.id,
            "villa": villa.id,
            "ended": f.booking(villa, meera, day(-5), nights=3).id,
            "ends_today": f.booking(villa, meera, day(-2), nights=2).id,
            "last_day": f.booking(villa, meera, day(-16), nights=2).id,
            "too_old": f.booking(villa, meera, day(-20), nights=3).id,
            "upcoming": f.booking(villa, meera, day(10), nights=2).id,
            "cancelled": f.booking(villa, meera, day(-9), nights=2, status="cancelled").id,
        }


def post(client: TestClient, booking: int, body: dict[str, Any] | None = None) -> Any:
    return client.post(f"/api/bookings/{booking}/review", json=body or GOOD)


def test_a_guest_reviews_a_completed_stay_once(client: TestClient, world: dict[str, int]) -> None:
    login(client, world["meera"])
    before = client.get(f"/api/bookings/{world['ended']}").json()
    assert before["can_review"] is True and before["review"] is None

    response = post(client, world["ended"])
    assert response.status_code == 201, response.text
    review = response.json()
    assert review["rating"] == 4
    assert review["comment"] == "Quiet, clean and close to the lake."
    assert review["listing"] == {
        "id": world["villa"],
        "title": "Ananya's villa",
        "city": review["listing"]["city"],
        "removed": False,
    }

    after = client.get(f"/api/bookings/{world['ended']}").json()
    assert after["can_review"] is False
    assert after["review"]["rating"] == 4

    again = post(client, world["ended"])
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "already_reviewed"

    # It is now one of the listing's reviews, and one of hers.
    listed = client.get(f"/api/listings/{world['villa']}/reviews").json()
    assert [item["comment"] for item in listed["items"]] == ["Quiet, clean and close to the lake."]
    assert listed["items"][0]["author"]["name"] == "Meera"
    mine = client.get("/api/reviews/mine").json()["items"]
    assert [item["booking_id"] for item in mine] == [world["ended"]]


@pytest.mark.parametrize(
    ("stay", "status", "code"),
    [
        ("ends_today", 201, None),
        ("last_day", 201, None),
        ("too_old", 409, "review_window_closed"),
        ("upcoming", 409, "stay_not_completed"),
        ("cancelled", 409, "stay_not_completed"),
    ],
)
def test_only_a_stay_that_ended_within_the_window_can_be_reviewed(
    client: TestClient, world: dict[str, int], stay: str, status: int, code: str | None
) -> None:
    login(client, world["meera"])
    assert client.get(f"/api/bookings/{world[stay]}").json()["can_review"] is (status == 201)
    response = post(client, world[stay])
    assert response.status_code == status, response.text
    if code:
        assert response.json()["error"]["code"] == code


def test_only_the_guest_of_the_stay_can_review_it(
    client: TestClient, world: dict[str, int]
) -> None:
    assert post(client, world["ended"]).status_code == 401
    for other in ("arjun", "ananya"):  # another guest, and the host of the listing
        login(client, world[other])
        response = post(client, world["ended"])
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "booking_not_found"
    assert post(client, 999_999).status_code == 404
    login(client, world["meera"])
    assert client.get("/api/reviews/mine").json()["items"] == []


@pytest.mark.parametrize(
    "body",
    [
        {"rating": 0, "comment": "Fine"},
        {"rating": 6, "comment": "Fine"},
        {"rating": 4.5, "comment": "Fine"},
        {"rating": 4, "comment": "   "},
        {"rating": 4, "comment": "x" * 2001},
        {"rating": 4},
        {"rating": 4, "comment": "Fine", "guest_id": 1},
    ],
)
def test_a_bad_review_is_refused(
    client: TestClient, world: dict[str, int], body: dict[str, Any]
) -> None:
    login(client, world["meera"])
    assert post(client, world["ended"], body).status_code == 422
    assert client.get(f"/api/bookings/{world['ended']}").json()["review"] is None


def test_my_reviews_needs_a_session(client: TestClient) -> None:
    assert client.get("/api/reviews/mine").status_code == 401
