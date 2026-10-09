"""Plan §10.5: a host creates, edits and removes their own listings."""

from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db.session import Database
from tests.conftest import Build
from tests.factories import TODAY, listing_body, login


@pytest.fixture
def host_id(client: TestClient, build: Build) -> int:
    """A signed-in user, with the reference data in place."""
    with build() as f:
        user = f.user("Ananya")
    login(client, user.id)
    return user.id


def error(response: Any) -> dict[str, Any]:
    body: dict[str, Any] = response.json()["error"]
    return body


# --- create ------------------------------------------------------------------------------


def test_create_stores_the_listing_for_the_signed_in_user(client: TestClient, host_id: int) -> None:
    response = client.post("/api/listings", json=listing_body())
    assert response.status_code == 201
    created = response.json()
    assert created["host"]["id"] == host_id
    assert created["title"] == "Sunlit villa with a pool"
    assert created["photos"] == ["https://img.test/a.jpg", "https://img.test/b.jpg"]
    assert [amenity["slug"] for amenity in created["amenities"]] == ["wifi", "pool"]
    assert (created["latitude"], created["longitude"]) == (None, None)
    assert (created["rating_average"], created["review_count"]) == (None, 0)
    assert created["pets_allowed"] is True

    # It persists, appears in search and makes the user a host.
    assert client.get(f"/api/listings/{created['id']}").json() == created
    assert [item["id"] for item in client.get("/api/listings").json()["items"]] == [created["id"]]
    assert client.get("/api/auth/me").json()["user"]["is_host"] is True


def test_create_trims_text_drops_duplicate_amenities_and_applies_defaults(
    client: TestClient, host_id: int
) -> None:
    body = listing_body(title="  Quiet cabin  ", amenities=["pool", "wifi", "pool"], state=None)
    del body["cleaning_fee_minor"], body["pets_allowed"]
    created = client.post("/api/listings", json=body).json()
    assert created["title"] == "Quiet cabin"
    assert sorted(amenity["slug"] for amenity in created["amenities"]) == ["pool", "wifi"]
    assert (created["cleaning_fee_minor"], created["pets_allowed"], created["state"]) == (
        0,
        False,
        None,
    )


def test_the_body_cannot_choose_the_host(client: TestClient, host_id: int, build: Build) -> None:
    with build() as f:
        someone_else = f.user("Vikram")
    response = client.post("/api/listings", json=listing_body(host_id=someone_else.id))
    assert response.status_code == 422
    assert client.get("/api/listings").json()["total"] == 0


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("title", "Abcd"),  # 4 characters
        ("title", "   Abcd   "),  # 4 after trimming
        ("title", "x" * 81),
        ("description", "   "),
        ("description", "x" * 5001),
        ("property_type", "castle"),
        ("city", ""),
        ("country", " "),
        ("price_per_night_minor", 49_900),  # below ₹500
        ("price_per_night_minor", 50_000_100),  # above ₹5,00,000
        ("price_per_night_minor", 450_050),  # not whole rupees
        ("price_per_night_minor", "cheap"),
        ("cleaning_fee_minor", -100),
        ("cleaning_fee_minor", 2_500_100),
        ("cleaning_fee_minor", 150),
        ("max_guests", 0),
        ("max_guests", 17),
        ("bedrooms", -1),
        ("bedrooms", 21),
        ("beds", 0),
        ("beds", 31),
        ("bathrooms", 0),
        ("bathrooms", 21),
        ("photos", []),  # no photo
        ("photos", ["http://img.test/a.jpg"]),  # not https
        ("photos", ["https://img.test/" + "x" * 2000]),
        ("photos", [f"https://img.test/{n}.jpg" for n in range(21)]),
        ("photos", "https://img.test/a.jpg"),
        ("amenities", ["wifi", "sauna"]),  # unknown amenity
        ("pets_allowed", "sometimes"),
    ],
)
def test_create_rejects_invalid_input(
    client: TestClient, host_id: int, field: str, value: Any
) -> None:
    response = client.post("/api/listings", json=listing_body(**{field: value}))
    assert response.status_code == 422, response.text
    assert error(response)["code"] == "validation_error"
    assert field in error(response)["details"]["fields"][0]["path"]
    assert client.get("/api/listings").json()["total"] == 0  # nothing was half-written


@pytest.mark.parametrize("field", ["title", "description", "property_type", "city", "country",
                                   "price_per_night_minor", "max_guests", "bedrooms", "beds",
                                   "bathrooms", "photos"])  # fmt: skip
def test_create_requires_each_field(client: TestClient, host_id: int, field: str) -> None:
    body = listing_body()
    del body[field]
    assert client.post("/api/listings", json=body).status_code == 422


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("title", "Abcde"),
        ("title", "x" * 80),
        ("price_per_night_minor", 50_000),
        ("price_per_night_minor", 50_000_000),
        ("cleaning_fee_minor", 2_500_000),
        ("max_guests", 16),
        ("bedrooms", 0),
        ("photos", [f"https://img.test/{n}.jpg" for n in range(20)]),
        ("amenities", []),
    ],
)
def test_create_accepts_the_edges(client: TestClient, host_id: int, field: str, value: Any) -> None:
    assert client.post("/api/listings", json=listing_body(**{field: value})).status_code == 201


# --- update ------------------------------------------------------------------------------


def test_update_changes_only_what_is_sent(client: TestClient, host_id: int) -> None:
    created = client.post("/api/listings", json=listing_body()).json()

    response = client.patch(
        f"/api/listings/{created['id']}",
        json={"price_per_night_minor": 950_000, "state": None},
    )
    assert response.status_code == 200
    updated = response.json()
    assert (updated["price_per_night_minor"], updated["state"]) == (950_000, None)
    unchanged = ("title", "description", "city", "photos", "amenities", "max_guests", "created_at")
    assert all(updated[key] == created[key] for key in unchanged)
    assert updated["updated_at"] >= created["updated_at"]
    assert client.get(f"/api/listings/{created['id']}").json() == updated


def test_update_replaces_the_whole_photo_and_amenity_sets(client: TestClient, host_id: int) -> None:
    created = client.post("/api/listings", json=listing_body()).json()
    updated = client.patch(
        f"/api/listings/{created['id']}",
        json={
            "photos": [
                "https://img.test/z.jpg",
                "https://img.test/a.jpg",
                "https://img.test/y.jpg",
            ],
            "amenities": ["kitchen"],
            "property_type": "cabin",
        },
    ).json()
    assert updated["photos"] == [
        "https://img.test/z.jpg",
        "https://img.test/a.jpg",
        "https://img.test/y.jpg",
    ]
    assert [amenity["slug"] for amenity in updated["amenities"]] == ["kitchen"]
    assert updated["property_type"]["slug"] == "cabin"


@pytest.mark.parametrize(
    "changes",
    [
        {"title": "No"},
        {"title": None},
        {"price_per_night_minor": 10},
        {"photos": []},
        {"photos": ["http://img.test/a.jpg"]},
        {"amenities": ["sauna"]},
        {"property_type": "castle"},
        {"max_guests": None},
        {"host_id": 2},
        {"deleted_at": None},
    ],
)
def test_update_rejects_invalid_input_and_changes_nothing(
    client: TestClient, host_id: int, changes: dict[str, Any]
) -> None:
    created = client.post("/api/listings", json=listing_body()).json()
    response = client.patch(f"/api/listings/{created['id']}", json={"city": "Changed"} | changes)
    assert response.status_code == 422, response.text
    assert client.get(f"/api/listings/{created['id']}").json() == created


def test_a_price_change_does_not_touch_existing_bookings(
    client: TestClient, host_id: int, build: Build, database: Database
) -> None:
    created = client.post("/api/listings", json=listing_body()).json()
    with build() as f:
        from app.listings.models import Listing

        listing = f.session.get(Listing, created["id"])
        assert listing is not None
        booking = f.booking(listing, f.user("Guest"), TODAY + timedelta(days=5))

    client.patch(f"/api/listings/{created['id']}", json={"price_per_night_minor": 5_000_000})

    with database.engine.connect() as connection:
        stored = connection.exec_driver_sql(
            "SELECT nightly_price_minor, total_minor FROM bookings WHERE id = ?", (booking.id,)
        ).one()
    assert tuple(stored) == (800_000, booking.total_minor)


# --- ownership ---------------------------------------------------------------------------


def test_only_the_owner_can_update_or_remove(
    client: TestClient, host_id: int, build: Build
) -> None:
    created = client.post("/api/listings", json=listing_body()).json()
    with build() as f:
        other = f.user("Vikram")
    login(client, other.id)

    for response in (
        client.patch(f"/api/listings/{created['id']}", json={"title": "Taken over"}),
        client.delete(f"/api/listings/{created['id']}"),
    ):
        assert response.status_code == 403
        assert error(response)["code"] == "not_listing_owner"
    assert client.get(f"/api/listings/{created['id']}").json()["title"] == created["title"]


def test_unknown_listings_are_404_for_update_and_remove(client: TestClient, host_id: int) -> None:
    for response in (
        client.patch("/api/listings/9999", json={"title": "Nothing here"}),
        client.delete("/api/listings/9999"),
    ):
        assert response.status_code == 404
        assert error(response)["code"] == "listing_not_found"


# --- remove ------------------------------------------------------------------------------


def test_remove_hides_the_listing_everywhere_and_clears_wishlists(
    client: TestClient, host_id: int, build: Build, database: Database
) -> None:
    created = client.post("/api/listings", json=listing_body()).json()
    listing_id = created["id"]
    client.put(f"/api/wishlist/{listing_id}")

    assert client.delete(f"/api/listings/{listing_id}").status_code == 204

    assert client.get(f"/api/listings/{listing_id}").status_code == 404
    assert client.get("/api/listings").json()["total"] == 0
    assert client.get("/api/hosting/listings").json() == {"items": []}
    assert client.get("/api/wishlist").json() == {"items": []}
    assert client.get("/api/wishlist/ids").json() == {"ids": []}
    assert client.get("/api/auth/me").json()["user"]["is_host"] is False
    # Removing again, or editing, finds nothing.
    assert client.delete(f"/api/listings/{listing_id}").status_code == 404
    assert (
        client.patch(f"/api/listings/{listing_id}", json={"title": "Back again"}).status_code == 404
    )

    # The row is kept (soft delete), so past trips can still point at it.
    with database.engine.connect() as connection:
        row = connection.exec_driver_sql(
            "SELECT deleted_at IS NOT NULL, (SELECT count(*) FROM wishlist_items) FROM listings"
            " WHERE id = ?",
            (listing_id,),
        ).one()
    assert tuple(row) == (1, 0)


@pytest.mark.parametrize(
    ("check_in_offset", "nights", "status", "allowed"),
    [
        (5, 2, "confirmed", False),  # upcoming
        (-1, 3, "confirmed", False),  # in progress: checks out after today
        (-2, 2, "confirmed", True),  # checks out today: the stay is over
        (-10, 2, "confirmed", True),  # past
        (5, 2, "cancelled", True),  # cancelled stays do not block
    ],
)
def test_remove_is_blocked_only_by_upcoming_confirmed_reservations(
    client: TestClient,
    host_id: int,
    build: Build,
    check_in_offset: int,
    nights: int,
    status: str,
    allowed: bool,
) -> None:
    created = client.post("/api/listings", json=listing_body()).json()
    with build() as f:
        from app.listings.models import Listing

        listing = f.session.get(Listing, created["id"])
        assert listing is not None
        f.booking(
            listing,
            f.user("Guest"),
            TODAY + timedelta(days=check_in_offset),
            nights,
            status=status,
        )

    response = client.delete(f"/api/listings/{created['id']}")
    if allowed:
        assert response.status_code == 204
    else:
        assert response.status_code == 409
        assert error(response)["code"] == "listing_has_upcoming_reservations"
        assert client.get(f"/api/listings/{created['id']}").status_code == 200


# --- /api/hosting/listings ---------------------------------------------------------------


def test_hosting_lists_only_the_callers_listings_newest_first(
    client: TestClient, host_id: int, build: Build
) -> None:
    first = client.post("/api/listings", json=listing_body(title="First home")).json()
    second = client.post("/api/listings", json=listing_body(title="Second home")).json()
    with build() as f:
        other = f.user("Vikram")
        f.listing(other)

    items = client.get("/api/hosting/listings").json()["items"]
    assert [item["id"] for item in items] == [second["id"], first["id"]]
    assert items[0]["photos"] == ["https://img.test/a.jpg", "https://img.test/b.jpg"]

    login(client, other.id)
    assert len(client.get("/api/hosting/listings").json()["items"]) == 1
