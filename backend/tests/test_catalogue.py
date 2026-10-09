"""Reference data, location suggestions, listing detail and reviews (plan §10.6, §10.7)."""

from fastapi.testclient import TestClient

from tests.conftest import Build
from tests.factories import NOW

# --- /api/meta ---------------------------------------------------------------------------


def test_meta_serves_reference_data_fee_rate_and_limits(client: TestClient, build: Build) -> None:
    with build():
        pass  # reference data only

    body = client.get("/api/meta").json()
    assert body["property_types"] == [
        {"slug": "villa", "name": "Villa"},
        {"slug": "apartment", "name": "Apartment"},
        {"slug": "cabin", "name": "Cabin"},
    ]
    assert {"slug": "pool", "name": "Pool", "category": "outdoor"} in body["amenities"]
    assert len(body["amenity_categories"]) == 11
    assert body["service_fee_bps"] == 1500
    assert body["currency"] == "INR"
    # Captures A5 and C3; the pets limit is provisional (docs/parity-notes.md).
    assert body["guest_limits"] == {
        "min_adults": 1,
        "max_guests": 16,
        "max_infants": 5,
        "max_pets": 5,
    }
    assert (body["default_page_size"], body["max_page_size"]) == (18, 50)


# --- /api/locations ----------------------------------------------------------------------


def test_locations_are_distinct_places_with_counts_busiest_first(
    client: TestClient, build: Build
) -> None:
    with build() as f:
        host = f.user("Host")
        for _ in range(2):
            f.listing(host, city="Udaipur", state="Rajasthan")
        f.listing(host, city="Jaipur", state="Rajasthan")
        f.listing(host, city="Candolim", state="Goa")
        f.listing(host, city="Jaipur", state="Rajasthan", deleted_at=NOW)  # removed: not counted

    everything = client.get("/api/locations").json()["items"]
    assert everything[0] == {
        "city": "Udaipur",
        "state": "Rajasthan",
        "country": "India",
        "listing_count": 2,
    }
    assert [(item["city"], item["listing_count"]) for item in everything] == [
        ("Udaipur", 2),
        ("Candolim", 1),
        ("Jaipur", 1),
    ]

    def cities(query: str) -> list[str]:
        response = client.get("/api/locations", params={"q": query})
        return [item["city"] for item in response.json()["items"]]

    assert cities("pur") == ["Udaipur", "Jaipur"]
    assert cities("GOA") == ["Candolim"]
    assert cities("rajasthan") == ["Udaipur", "Jaipur"]
    assert cities("%") == []
    assert cities("nowhere") == []


def test_locations_returns_at_most_eight(client: TestClient, build: Build) -> None:
    with build() as f:
        host = f.user("Host")
        for number in range(10):
            f.listing(host, city=f"Town {number}")
    assert len(client.get("/api/locations").json()["items"]) == 8


# --- /api/listings/{id} ------------------------------------------------------------------


def test_detail_has_all_photos_amenities_host_and_rating(client: TestClient, build: Build) -> None:
    with build() as f:
        host = f.user("Ananya", bio="I restore old homes.")
        guest = f.user("Guest")
        listing = f.listing(host, "cabin", amenities=("wifi", "pool"), photos=8, pets_allowed=True)
        f.listing(host)
        f.listing(host, deleted_at=NOW)
        for rating in (5, 5, 4, 3):
            f.review(listing, guest, rating)

    response = client.get(f"/api/listings/{listing.id}")
    assert response.status_code == 200
    body = response.json()
    assert len(body["photos"]) == 8 and body["photos"][0].endswith("-0.jpg")
    assert body["amenities"] == [
        {"slug": "wifi", "name": "Wifi", "category": "internet_office"},
        {"slug": "pool", "name": "Pool", "category": "outdoor"},
    ]
    assert body["host"] == {
        "id": host.id,
        "name": "Ananya",
        "avatar_url": None,
        "bio": "I restore old homes.",
        "joined_at": "2026-01-01T00:00:00Z",
        "listing_count": 2,
    }
    assert (body["rating_average"], body["review_count"]) == (4.25, 4)
    assert body["description"] == "A place to stay."
    assert body["cleaning_fee_minor"] == 120_000
    assert body["pets_allowed"] is True
    assert body["property_type"] == {"slug": "cabin", "name": "Cabin"}


def test_detail_of_an_unknown_or_removed_listing_is_404(client: TestClient, build: Build) -> None:
    with build() as f:
        removed = f.listing(f.user("Host"), deleted_at=NOW)

    for listing_id in (removed.id, 9999):
        for path in (f"/api/listings/{listing_id}", f"/api/listings/{listing_id}/reviews"):
            response = client.get(path)
            assert response.status_code == 404
            assert response.json()["error"]["code"] == "listing_not_found"
    assert client.get("/api/listings/not-a-number").status_code == 422


# --- /api/listings/{id}/reviews ----------------------------------------------------------


def test_reviews_are_paged_newest_first_with_their_author(client: TestClient, build: Build) -> None:
    with build() as f:
        host, meera, arjun = f.user("Host"), f.user("Meera"), f.user("Arjun")
        listing = f.listing(host)
        other = f.listing(host)
        first = f.review(listing, meera, 4)
        second = f.review(listing, arjun, 5)
        third = f.review(listing, meera, 3)
        f.review(other, arjun, 1)  # another listing's review never appears

    body = client.get(f"/api/listings/{listing.id}/reviews", params={"page_size": 2}).json()
    assert [item["id"] for item in body["items"]] == [third.id, second.id]
    assert body["items"][1] == {
        "id": second.id,
        "rating": 5,
        "comment": second.comment,
        "created_at": second.created_at.isoformat().replace("+00:00", "Z"),
        "author": {"name": "Arjun", "avatar_url": None},
    }
    assert (body["page"], body["page_size"], body["total"], body["total_pages"]) == (1, 2, 3, 2)
    assert body["rating_average"] == 4.0

    page_two = client.get(
        f"/api/listings/{listing.id}/reviews", params={"page_size": 2, "page": 2}
    ).json()
    assert [item["id"] for item in page_two["items"]] == [first.id]


def test_a_listing_without_reviews_has_an_empty_page(client: TestClient, build: Build) -> None:
    with build() as f:
        listing = f.listing(f.user("Host"))
    body = client.get(f"/api/listings/{listing.id}/reviews").json()
    assert body == {
        "items": [],
        "page": 1,
        "page_size": 10,
        "total": 0,
        "total_pages": 0,
        "rating_average": None,
    }


def test_reviews_paging_is_validated(client: TestClient, build: Build) -> None:
    with build() as f:
        listing = f.listing(f.user("Host"))
    for params in ({"page": 0}, {"page_size": 0}, {"page_size": 51}):
        response = client.get(f"/api/listings/{listing.id}/reviews", params=params)
        assert response.status_code == 422
