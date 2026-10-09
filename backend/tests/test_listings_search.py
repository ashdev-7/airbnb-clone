"""Plan §10.6: search and filters, every rule except dates (Phase 4)."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import Build


def ids(response: Any) -> list[int]:
    assert response.status_code == 200, response.text
    return [item["id"] for item in response.json()["items"]]


def search(client: TestClient, **params: Any) -> list[int]:
    return ids(client.get("/api/listings", params=params))


@pytest.fixture
def catalogue(build: Build) -> dict[str, int]:
    """Four listings that differ in every filterable way."""
    with build() as f:
        host = f.user("Host")
        return {
            "jaipur_villa": f.listing(
                host,
                "villa",
                amenities=("wifi", "pool", "kitchen"),
                city="Jaipur",
                state="Rajasthan",
                price_per_night_minor=1_200_000,
                max_guests=8,
                bedrooms=4,
                beds=5,
                bathrooms=3,
                pets_allowed=True,
            ).id,
            "udaipur_flat": f.listing(
                host,
                "apartment",
                amenities=("wifi",),
                city="Udaipur",
                state="Rajasthan",
                price_per_night_minor=300_000,
                max_guests=2,
                bedrooms=1,
                beds=1,
                bathrooms=1,
            ).id,
            "goa_villa": f.listing(
                host,
                "villa",
                amenities=("wifi", "pool"),
                city="Candolim",
                state="Goa",
                price_per_night_minor=900_000,
                max_guests=6,
                bedrooms=3,
                beds=3,
                bathrooms=2,
            ).id,
            "manali_cabin": f.listing(
                host,
                "cabin",
                amenities=("kitchen",),
                city="Manali",
                state="Himachal Pradesh",
                price_per_night_minor=450_000,
                max_guests=4,
                bedrooms=2,
                beds=2,
                bathrooms=1,
                pets_allowed=True,
            ).id,
        }


# --- shape and order ---------------------------------------------------------------------


def test_no_filters_returns_everything_newest_first(
    client: TestClient, catalogue: dict[str, int]
) -> None:
    body = client.get("/api/listings").json()
    assert [item["id"] for item in body["items"]] == sorted(catalogue.values(), reverse=True)
    assert (body["page"], body["page_size"], body["total"], body["total_pages"]) == (1, 18, 4, 1)


def test_a_card_carries_everything_it_needs(client: TestClient, build: Build) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        listing = f.listing(host, "villa", photos=7, latitude=26.9, longitude=75.8)
        for rating in (5, 4, 4):
            f.review(listing, guest, rating)

    (card,) = client.get("/api/listings").json()["items"]
    assert card == {
        "id": listing.id,
        "title": listing.title,
        "property_type": {"slug": "villa", "name": "Villa"},
        "city": "Jaipur",
        "state": "Rajasthan",
        "country": "India",
        "latitude": 26.9,
        "longitude": 75.8,
        "photos": [f"https://img.test/{listing.title.split()[1]}-{n}.jpg" for n in range(5)],
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "bathrooms": 1,
        "pets_allowed": False,
        "price_per_night_minor": 450_000,
        "currency": "INR",
        "rating_average": 4.33,
        "review_count": 3,
        "guest_favourite": False,
        "stay_total_minor": None,
    }


def test_rating_is_hidden_until_three_reviews(client: TestClient, build: Build) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        new = f.listing(host)
        two = f.listing(host)
        for _ in range(2):
            f.review(two, guest, 5)

    cards = {card["id"]: card for card in client.get("/api/listings").json()["items"]}
    assert (cards[new.id]["rating_average"], cards[new.id]["review_count"]) == (None, 0)
    assert (cards[two.id]["rating_average"], cards[two.id]["review_count"]) == (None, 2)


def test_removed_listings_are_absent(client: TestClient, build: Build) -> None:
    from tests.factories import NOW

    with build() as f:
        host = f.user("Host")
        kept = f.listing(host)
        f.listing(host, deleted_at=NOW)

    assert search(client) == [kept.id]
    assert client.get("/api/listings/summary").json()["total"] == 1


# --- location ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("location", "expected"),
    [
        ("Jaipur", ["jaipur_villa"]),
        ("jaip", ["jaipur_villa"]),  # substring, any case
        ("RAJASTHAN", ["udaipur_flat", "jaipur_villa"]),  # state
        ("india", ["manali_cabin", "goa_villa", "udaipur_flat", "jaipur_villa"]),  # country
        ("Candolim, Goa", ["goa_villa"]),  # every part must match
        ("Candolim, Rajasthan", []),
        ("Udaipur, Rajasthan, India", ["udaipur_flat"]),
        ("  ,  ", ["manali_cabin", "goa_villa", "udaipur_flat", "jaipur_villa"]),  # empty
        ("%", []),  # wildcards are literal
        ("_", []),
        ("Atlantis", []),
    ],
)
def test_location(
    client: TestClient, catalogue: dict[str, int], location: str, expected: list[str]
) -> None:
    assert search(client, location=location) == [catalogue[name] for name in expected]


# --- guests ------------------------------------------------------------------------------


def test_guests_adults_and_children_must_fit_but_infants_do_not_count(
    client: TestClient, catalogue: dict[str, int]
) -> None:
    c = catalogue
    assert search(client, adults=5) == [c["goa_villa"], c["jaipur_villa"]]
    assert search(client, adults=4, children=2) == [c["goa_villa"], c["jaipur_villa"]]
    assert search(client, adults=4, children=4) == [c["jaipur_villa"]]  # exactly at capacity
    assert search(client, adults=8, children=1) == []  # over every capacity
    assert search(client, adults=2, infants=5) == sorted(c.values(), reverse=True)


def test_pets_keeps_only_listings_that_allow_them(
    client: TestClient, catalogue: dict[str, int]
) -> None:
    assert search(client, pets=1) == [catalogue["manali_cabin"], catalogue["jaipur_villa"]]
    assert len(search(client, pets=0)) == 4


@pytest.mark.parametrize(
    "params",
    [
        {"adults": -1},
        {"adults": 17},
        {"adults": 10, "children": 7},  # 17 guests in total
        {"children": -1},
        {"infants": 6},
        {"pets": 6},
        {"adults": "two"},
    ],
)
def test_invalid_guest_counts_are_rejected(client: TestClient, params: dict[str, Any]) -> None:
    response = client.get("/api/listings", params=params)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


# --- price, type, amenities, rooms -------------------------------------------------------


def test_price_bounds_are_inclusive(client: TestClient, catalogue: dict[str, int]) -> None:
    c = catalogue
    assert search(client, min_price_minor=450_000) == [
        c["manali_cabin"],
        c["goa_villa"],
        c["jaipur_villa"],
    ]
    assert search(client, max_price_minor=450_000) == [c["manali_cabin"], c["udaipur_flat"]]
    assert search(client, min_price_minor=300_000, max_price_minor=900_000) == [
        c["manali_cabin"],
        c["goa_villa"],
        c["udaipur_flat"],
    ]
    assert search(client, min_price_minor=900_000, max_price_minor=900_000) == [c["goa_villa"]]


def test_min_price_above_max_price_is_rejected(client: TestClient) -> None:
    response = client.get("/api/listings", params={"min_price_minor": 2, "max_price_minor": 1})
    assert response.status_code == 422
    assert (
        client.get(
            "/api/listings/summary", params={"min_price_minor": 2, "max_price_minor": 1}
        ).status_code
        == 422
    )


def test_property_types_match_any(client: TestClient, catalogue: dict[str, int]) -> None:
    c = catalogue
    assert search(client, property_type="cabin") == [c["manali_cabin"]]
    assert search(client, property_type=["cabin", "apartment"]) == [
        c["manali_cabin"],
        c["udaipur_flat"],
    ]
    assert search(client, property_type="castle") == []


def test_amenities_must_all_be_present(client: TestClient, catalogue: dict[str, int]) -> None:
    c = catalogue
    assert search(client, amenity="pool") == [c["goa_villa"], c["jaipur_villa"]]
    assert search(client, amenity=["pool", "kitchen"]) == [c["jaipur_villa"]]
    assert search(client, amenity=["pool", "pool"]) == [c["goa_villa"], c["jaipur_villa"]]
    assert search(client, amenity=["pool", "sauna"]) == []  # unknown amenity: nothing has it


def test_room_minimums(client: TestClient, catalogue: dict[str, int]) -> None:
    c = catalogue
    assert search(client, min_bedrooms=3) == [c["goa_villa"], c["jaipur_villa"]]
    assert search(client, min_beds=5) == [c["jaipur_villa"]]
    assert search(client, min_bathrooms=2) == [c["goa_villa"], c["jaipur_villa"]]
    assert search(client, min_bedrooms=2, min_bathrooms=3) == [c["jaipur_villa"]]


def test_filter_groups_combine_with_and(client: TestClient, catalogue: dict[str, int]) -> None:
    c = catalogue
    assert search(
        client, location="Rajasthan", property_type="villa", amenity="pool", adults=6, pets=1
    ) == [c["jaipur_villa"]]


def test_contradictory_filters_return_an_empty_page(
    client: TestClient, catalogue: dict[str, int]
) -> None:
    response = client.get("/api/listings", params={"property_type": "apartment", "min_bedrooms": 4})
    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "page": 1,
        "page_size": 18,
        "total": 0,
        "total_pages": 0,
    }


# --- pagination --------------------------------------------------------------------------


def test_pages_cover_every_listing_once(client: TestClient, build: Build) -> None:
    with build() as f:
        host = f.user("Host")
        expected = [f.listing(host).id for _ in range(7)]

    seen: list[int] = []
    for page in (1, 2, 3):
        body = client.get("/api/listings", params={"page": page, "page_size": 3}).json()
        assert (body["total"], body["total_pages"], body["page"]) == (7, 3, page)
        seen += [item["id"] for item in body["items"]]
    assert seen == sorted(expected, reverse=True)


def test_pages_of_a_filtered_search_cover_every_match_once(
    client: TestClient, build: Build
) -> None:
    """A filter that leaves several pages but not every listing: the pages hold exactly
    the matches, each once, newest first."""
    with build() as f:
        host = f.user("Host")
        matching: list[int] = []
        for number in range(40):
            pets = number % 3 != 0  # 26 of the 40 allow pets, mixed in with the others
            listing = f.listing(host, city="Goa" if number % 2 else "Manali", pets_allowed=pets)
            if pets:
                matching.append(listing.id)

    params = {"adults": 1, "pets": 1, "page_size": 10}
    seen: list[int] = []
    for page in (1, 2, 3):
        body = client.get("/api/listings", params=params | {"page": page}).json()
        assert (body["total"], body["total_pages"], body["page"]) == (26, 3, page)
        assert all(item["pets_allowed"] for item in body["items"])
        seen += [item["id"] for item in body["items"]]

    assert len(seen) == len(set(seen)) == 26
    assert seen == sorted(matching, reverse=True)
    assert client.get("/api/listings", params=params | {"page": 4}).json()["items"] == []
    assert (
        client.get("/api/listings/summary", params={"adults": 1, "pets": 1}).json()["total"] == 26
    )


def test_a_page_past_the_end_is_empty(client: TestClient, catalogue: dict[str, int]) -> None:
    body = client.get("/api/listings", params={"page": 9}).json()
    assert body["items"] == [] and body["total"] == 4 and body["page"] == 9


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 51}])
def test_invalid_paging_is_rejected(client: TestClient, params: dict[str, int]) -> None:
    response = client.get("/api/listings", params=params)
    assert response.status_code == 422
    assert response.json()["error"]["details"]["fields"][0]["path"].startswith("query.")


def test_page_size_may_be_as_large_as_the_cap(
    client: TestClient, catalogue: dict[str, int]
) -> None:
    assert client.get("/api/listings", params={"page_size": 50}).json()["page_size"] == 50


# --- summary -----------------------------------------------------------------------------


def test_summary_total_honours_every_filter_but_the_price_range_ignores_the_bounds(
    client: TestClient, catalogue: dict[str, int]
) -> None:
    body = client.get(
        "/api/listings/summary",
        params={"location": "Rajasthan", "min_price_minor": 1_000_000},
    ).json()
    assert body["total"] == 1
    assert (body["price_min_minor"], body["price_max_minor"]) == (300_000, 1_200_000)
    assert body["currency"] == "INR"
    assert sum(bucket["count"] for bucket in body["histogram"]) == 2
    assert body["histogram"][0]["from_minor"] == 300_000
    assert body["histogram"][-1]["to_minor"] >= 1_200_000


def test_summary_of_nothing(client: TestClient, catalogue: dict[str, int]) -> None:
    body = client.get("/api/listings/summary", params={"location": "Atlantis"}).json()
    assert body == {
        "total": 0,
        "price_min_minor": None,
        "price_max_minor": None,
        "currency": "INR",
        "histogram": [],
    }
