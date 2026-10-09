"""Plan §10.6: searching by dates keeps only listings free for the whole stay."""

from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import Build
from tests.factories import TODAY


def day(offset: int) -> date:
    return TODAY + timedelta(days=offset)


def dates(start: int, end: int) -> dict[str, str]:
    return {"check_in": day(start).isoformat(), "check_out": day(end).isoformat()}


@pytest.fixture
def listings(build: Build) -> dict[str, int]:
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        free = f.listing(host)
        booked = f.listing(host)
        cancelled = f.listing(host)
        f.booking(booked, guest, day(10), nights=5)
        f.booking(cancelled, guest, day(10), nights=5, status="cancelled")
        return {"free": free.id, "booked": booked.id, "cancelled": cancelled.id}


def found(client: TestClient, **params: Any) -> list[int]:
    response = client.get("/api/listings", params=params)
    assert response.status_code == 200, response.text
    return [item["id"] for item in response.json()["items"]]


@pytest.mark.parametrize(
    ("start", "end", "booked_is_listed"),
    [
        (15, 20, True),  # starts on the check-out day
        (5, 10, True),  # ends on the check-in day
        (14, 16, False),
        (9, 11, False),
        (11, 13, False),
        (8, 18, False),
        (30, 32, True),
    ],
)
def test_search_by_dates_follows_the_overlap_rule(
    client: TestClient, listings: dict[str, int], start: int, end: int, booked_is_listed: bool
) -> None:
    ids = found(client, **dates(start, end))
    assert listings["free"] in ids
    assert listings["cancelled"] in ids  # a cancelled stay does not block
    assert (listings["booked"] in ids) is booked_is_listed


def test_without_dates_nothing_is_filtered_and_there_is_no_stay_total(
    client: TestClient, listings: dict[str, int]
) -> None:
    body = client.get("/api/listings").json()
    assert body["total"] == 3
    assert all(item["stay_total_minor"] is None for item in body["items"])


def test_with_dates_each_card_carries_the_total_a_quote_would_give(
    client: TestClient, listings: dict[str, int]
) -> None:
    stay = dates(20, 25)
    body = client.get("/api/listings", params=stay).json()
    assert body["total"] == 3
    for item in body["items"]:
        quote = client.get(f"/api/listings/{item['id']}/quote", params=stay).json()
        assert item["stay_total_minor"] == quote["total_minor"] == 2_725_500
        assert item["price_per_night_minor"] == 450_000  # the nightly price is still there


def test_dates_combine_with_other_filters_and_the_summary(
    client: TestClient, listings: dict[str, int]
) -> None:
    assert found(client, **dates(11, 13), adults=4) == [listings["cancelled"], listings["free"]]
    assert found(client, **dates(11, 13), adults=5) == []
    assert client.get("/api/listings/summary", params=dates(11, 13)).json()["total"] == 2
    assert client.get("/api/listings/summary", params=dates(30, 32)).json()["total"] == 3


def test_one_date_without_the_other_is_rejected(client: TestClient) -> None:
    for params in ({"check_in": day(5).isoformat()}, {"check_out": day(5).isoformat()}):
        for path in ("/api/listings", "/api/listings/summary"):
            response = client.get(path, params=params)
            assert response.status_code == 422
            assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize(("start", "end"), [(5, 5), (7, 5), (-3, 2), (729, 731)])
def test_dates_outside_the_rules_are_rejected(client: TestClient, start: int, end: int) -> None:
    for path in ("/api/listings", "/api/listings/summary"):
        response = client.get(path, params=dates(start, end))
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_dates"


def test_search_by_dates_still_costs_three_statements(
    client: TestClient, listings: dict[str, int], database: Any
) -> None:
    from tests.test_query_count import counted

    with counted(database) as statements:
        assert len(found(client, **dates(20, 25))) == 3
    assert len(statements) == 3
