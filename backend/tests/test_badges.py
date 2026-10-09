"""Badges derived from reviews and stays (plan §10.7, bonus B3)."""

from typing import Any

from fastapi.testclient import TestClient

from tests.conftest import Build


def detail(client: TestClient, listing_id: int) -> dict[str, Any]:
    response = client.get(f"/api/listings/{listing_id}")
    assert response.status_code == 200, response.text
    result: dict[str, Any] = response.json()
    return result


def test_guest_favourite_needs_five_reviews_averaging_4_9(client: TestClient, build: Build) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        loved = f.listing(host, title="Loved by all")
        too_few = f.listing(host, title="Four perfect reviews")
        mixed = f.listing(host, title="Five reviews, one of four stars")
        for _ in range(5):
            f.review(loved, guest, rating=5)
        for _ in range(4):
            f.review(too_few, guest, rating=5)
        for rating in (5, 5, 5, 5, 4):
            f.review(mixed, guest, rating=rating)
        ids = {"loved": loved.id, "too_few": too_few.id, "mixed": mixed.id}

    assert detail(client, ids["loved"])["guest_favourite"] is True
    assert detail(client, ids["too_few"])["guest_favourite"] is False
    assert detail(client, ids["mixed"])["guest_favourite"] is False  # 4.8

    cards = {card["id"]: card for card in client.get("/api/listings").json()["items"]}
    assert {name: cards[listing]["guest_favourite"] for name, listing in ids.items()} == {
        "loved": True,
        "too_few": False,
        "mixed": False,
    }


def test_superhost_needs_ten_completed_stays_and_a_rating_of_4_8(
    client: TestClient, build: Build
) -> None:
    with build() as f:
        guest = f.user("Guest")
        seasoned, newcomer, harsh = f.user("Seasoned"), f.user("Newcomer"), f.user("Harshly rated")
        # Ten stays across two listings, rated 4.8 on average.
        first, second = f.listing(seasoned), f.listing(seasoned)
        for index in range(10):
            f.review(first if index % 2 else second, guest, rating=4 if index < 2 else 5)
        nine = f.listing(newcomer)
        for _ in range(9):
            f.review(nine, guest, rating=5)
        low = f.listing(harsh)
        for index in range(10):
            f.review(low, guest, rating=4 if index < 3 else 5)
        ids = {"seasoned": first.id, "newcomer": nine.id, "harsh": low.id}

    assert detail(client, ids["seasoned"])["host"]["is_superhost"] is True
    assert detail(client, ids["newcomer"])["host"]["is_superhost"] is False
    assert detail(client, ids["harsh"])["host"]["is_superhost"] is False  # 4.7
