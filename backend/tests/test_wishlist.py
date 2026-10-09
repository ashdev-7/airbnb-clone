"""Plan §10.10: one wishlist per user, with idempotent save and unsave."""

from fastapi.testclient import TestClient

from tests.conftest import Build
from tests.factories import NOW, login


def test_save_and_unsave_are_idempotent(client: TestClient, build: Build) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Meera")
        first, second = f.listing(host), f.listing(host)
    login(client, guest.id)

    for _ in range(2):  # the second save changes nothing
        assert client.put(f"/api/wishlist/{first.id}").status_code == 204
    assert client.put(f"/api/wishlist/{second.id}").status_code == 204
    assert client.get("/api/wishlist/ids").json() == {"ids": [first.id, second.id]}

    for _ in range(2):  # the second unsave changes nothing
        assert client.delete(f"/api/wishlist/{first.id}").status_code == 204
    assert client.get("/api/wishlist/ids").json() == {"ids": [second.id]}
    assert client.delete("/api/wishlist/9999").status_code == 204  # nothing to remove


def test_the_wishlist_returns_cards_most_recently_saved_first(
    client: TestClient, build: Build
) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Meera")
        older, newer = f.listing(host, photos=7), f.listing(host)
    login(client, guest.id)
    client.put(f"/api/wishlist/{newer.id}")
    client.put(f"/api/wishlist/{older.id}")

    items = client.get("/api/wishlist").json()["items"]
    assert [item["id"] for item in items] == [older.id, newer.id]
    assert len(items[0]["photos"]) == 5 and items[0]["property_type"]["slug"] == "villa"


def test_each_user_has_their_own_wishlist(client: TestClient, build: Build) -> None:
    with build() as f:
        host, meera, arjun = f.user("Host"), f.user("Meera"), f.user("Arjun")
        listing = f.listing(host)
    login(client, meera.id)
    client.put(f"/api/wishlist/{listing.id}")

    login(client, arjun.id)
    assert client.get("/api/wishlist/ids").json() == {"ids": []}
    client.delete(f"/api/wishlist/{listing.id}")  # removes nothing of Meera's

    login(client, meera.id)
    assert client.get("/api/wishlist/ids").json() == {"ids": [listing.id]}


def test_an_unknown_or_removed_listing_cannot_be_saved(client: TestClient, build: Build) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Meera")
        removed = f.listing(host, deleted_at=NOW)
    login(client, guest.id)

    for listing_id in (removed.id, 9999):
        response = client.put(f"/api/wishlist/{listing_id}")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "listing_not_found"
    assert client.get("/api/wishlist/ids").json() == {"ids": []}


def test_listing_responses_do_not_depend_on_who_is_asking(client: TestClient, build: Build) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Meera")
        listing = f.listing(host)
    signed_out = client.get("/api/listings").json()

    login(client, guest.id)
    client.put(f"/api/wishlist/{listing.id}")
    assert client.get("/api/listings").json() == signed_out
