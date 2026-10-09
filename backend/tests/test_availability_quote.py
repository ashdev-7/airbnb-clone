"""Plan §10.1, §10.2, §10.4, §10.8: availability and the quote."""

from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import Build
from tests.factories import NOW, TODAY


def day(offset: int) -> date:
    return TODAY + timedelta(days=offset)


@pytest.fixture
def listing_id(build: Build) -> int:
    """₹4,500 a night, ₹1,200 cleaning, 4 guests, no pets; booked from day 10 to day 15."""
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        listing = f.listing(host)
        f.booking(listing, guest, day(10), nights=5)
        return listing.id


def quote(client: TestClient, listing_id: int, start: int, end: int, **guests: int) -> Any:
    params: dict[str, Any] = {"check_in": day(start).isoformat(), "check_out": day(end).isoformat()}
    return client.get(f"/api/listings/{listing_id}/quote", params=params | guests)


def code(response: Any) -> str:
    return str(response.json()["error"]["code"])


# --- availability ------------------------------------------------------------------------


def test_availability_lists_confirmed_ranges_in_the_default_window(
    client: TestClient, build: Build, listing_id: int
) -> None:
    with build() as f:
        from app.listings.models import Listing

        listing = f.session.get(Listing, listing_id)
        assert listing is not None
        guest = f.user("Another")
        f.booking(listing, guest, day(15), nights=2)  # back to back with the first
        f.booking(listing, guest, day(30), nights=3, status="cancelled")  # does not block
        f.booking(listing, guest, day(-20), nights=2)  # before the window
        f.booking(listing, guest, day(-1), nights=2)  # in progress: reaches into the window

    body = client.get(f"/api/listings/{listing_id}/availability").json()
    assert body == {
        "listing_id": listing_id,
        "start": TODAY.isoformat(),
        "end": day(730).isoformat(),
        "booked": [  # only dates: never who booked
            {"check_in": day(-1).isoformat(), "check_out": day(1).isoformat()},
            {"check_in": day(10).isoformat(), "check_out": day(15).isoformat()},
            {"check_in": day(15).isoformat(), "check_out": day(17).isoformat()},
        ],
    }


def test_availability_accepts_a_custom_window(client: TestClient, listing_id: int) -> None:
    def booked(start: int, end: int) -> int:
        response = client.get(
            f"/api/listings/{listing_id}/availability",
            params={"from": day(start).isoformat(), "to": day(end).isoformat()},
        )
        assert response.status_code == 200
        return len(response.json()["booked"])

    assert booked(0, 10) == 0  # ends on the check-in day: the stay is outside
    assert booked(0, 11) == 1
    assert booked(14, 20) == 1
    assert booked(15, 20) == 0  # starts on the check-out day


def test_availability_rejects_bad_windows_and_unknown_listings(
    client: TestClient, build: Build, listing_id: int
) -> None:
    with build() as f:
        removed = f.listing(f.user("Other host"), deleted_at=NOW).id
    path = f"/api/listings/{listing_id}/availability"
    backwards = client.get(path, params={"from": day(5).isoformat(), "to": day(5).isoformat()})
    assert (backwards.status_code, code(backwards)) == (422, "invalid_dates")
    assert client.get(path, params={"from": "tomorrow"}).status_code == 422
    for missing in (removed, 9999):
        response = client.get(f"/api/listings/{missing}/availability")
        assert (response.status_code, code(response)) == (404, "listing_not_found")


# --- quote: price ------------------------------------------------------------------------


def test_quote_is_the_breakdown_of_the_plan_example(client: TestClient, listing_id: int) -> None:
    response = quote(client, listing_id, 20, 25, adults=2)
    assert response.status_code == 200
    assert response.json() == {
        "check_in": day(20).isoformat(),
        "check_out": day(25).isoformat(),
        "nights": 5,
        "nightly_price_minor": 450_000,
        "nights_total_minor": 2_250_000,
        "cleaning_fee_minor": 120_000,
        "service_fee_minor": 355_500,
        "service_fee_bps": 1500,
        "total_minor": 2_725_500,
        "currency": "INR",
    }


def test_quote_rounds_the_service_fee_half_up_to_a_whole_rupee(
    client: TestClient, build: Build
) -> None:
    with build() as f:
        listing = f.listing(
            f.user("Host"), price_per_night_minor=101_000, cleaning_fee_minor=0
        )  # 15% of ₹1,010 is ₹151.50
    body = quote(client, listing.id, 1, 2).json()
    assert (body["service_fee_minor"], body["total_minor"]) == (15_200, 116_200)


# --- quote: the overlap table of plan §10.1 (existing stay: day 10 to day 15) -------------


@pytest.mark.parametrize(("start", "end"), [(15, 20), (5, 10)])
def test_quote_allows_stays_that_only_touch(
    client: TestClient, listing_id: int, start: int, end: int
) -> None:
    assert quote(client, listing_id, start, end).status_code == 200


@pytest.mark.parametrize(("start", "end"), [(14, 16), (9, 11), (11, 13), (8, 18)])
def test_quote_refuses_overlapping_stays(
    client: TestClient, listing_id: int, start: int, end: int
) -> None:
    response = quote(client, listing_id, start, end)
    assert (response.status_code, code(response)) == (409, "dates_unavailable")


# --- quote: date rules -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("start", "end"),
    [
        (20, 20),  # equal
        (22, 20),  # reversed
        (-2, 1),  # in the past
        (-30, -28),
        (729, 731),  # check-out beyond the 730-day window
        (800, 802),
    ],
)
def test_quote_rejects_invalid_dates(
    client: TestClient, listing_id: int, start: int, end: int
) -> None:
    response = quote(client, listing_id, start, end)
    assert (response.status_code, code(response)) == (422, "invalid_dates")


@pytest.mark.parametrize(
    ("start", "end"),
    [
        (0, 1),  # today, one night
        (-1, 1),  # yesterday: someone west of India may still be in "today"
        (728, 730),  # the last bookable night
    ],
)
def test_quote_accepts_the_edges_of_the_window(
    client: TestClient, listing_id: int, start: int, end: int
) -> None:
    assert quote(client, listing_id, start, end).status_code == 200


def test_quote_requires_both_dates_in_iso_form(client: TestClient, listing_id: int) -> None:
    path = f"/api/listings/{listing_id}/quote"
    for params in (
        {},
        {"check_in": day(20).isoformat()},
        {"check_in": "20/10/2026", "check_out": "22/10/2026"},
    ):
        response = client.get(path, params=params)
        assert (response.status_code, code(response)) == (422, "validation_error")


# --- quote: guest rules ------------------------------------------------------------------


@pytest.mark.parametrize(
    "guests",
    [
        {"adults": 0},
        {"adults": 0, "children": 2},
        {"adults": -1},
        {"adults": 2, "children": -1},
        {"adults": 5},  # over the capacity of 4
        {"adults": 3, "children": 2},
        {"adults": 2, "infants": 6},
        {"adults": 2, "infants": -1},
        {"adults": 2, "pets": 1},  # this listing does not allow pets
        {"adults": 2, "pets": -1},
    ],
)
def test_quote_rejects_invalid_guests(
    client: TestClient, listing_id: int, guests: dict[str, int]
) -> None:
    response = quote(client, listing_id, 20, 22, **guests)
    assert (response.status_code, code(response)) == (422, "invalid_guest_count")


@pytest.mark.parametrize(
    "guests",
    [
        {"adults": 4},  # exactly at capacity
        {"adults": 2, "children": 2},
        {"adults": 4, "infants": 5},  # infants do not count toward capacity
        {"adults": 1},
        {},  # one adult by default
    ],
)
def test_quote_accepts_valid_guests(
    client: TestClient, listing_id: int, guests: dict[str, int]
) -> None:
    assert quote(client, listing_id, 20, 22, **guests).status_code == 200


def test_pets_need_a_listing_that_allows_them_and_respect_the_limit(
    client: TestClient, build: Build
) -> None:
    with build() as f:
        listing = f.listing(f.user("Host"), pets_allowed=True)
    assert quote(client, listing.id, 20, 22, adults=2, pets=5).status_code == 200
    assert code(quote(client, listing.id, 20, 22, adults=2, pets=6)) == "invalid_guest_count"


def test_quote_of_an_unknown_or_removed_listing_is_404(client: TestClient, build: Build) -> None:
    with build() as f:
        removed = f.listing(f.user("Host"), deleted_at=NOW).id
    for missing in (removed, 9999):
        response = quote(client, missing, 20, 22)
        assert (response.status_code, code(response)) == (404, "listing_not_found")
