"""Plan §13: what was written is still there after the process lets go of the database
and opens it again (R-BK-4, R-HX-4)."""

from datetime import timedelta

from fastapi.testclient import TestClient

from tests.conftest import AppFactory, Build
from tests.factories import TODAY, book, listing_body, login


def test_listings_bookings_and_wishlists_survive_a_restart(
    make_app: AppFactory, client: TestClient, build: Build
) -> None:
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
    check_in = TODAY + timedelta(days=10)

    login(client, host.id)
    listing = client.post("/api/listings", json=listing_body()).json()
    login(client, guest.id)
    client.put(f"/api/wishlist/{listing['id']}")
    booking = book(client, listing["id"], check_in, nights=3).json()

    # "Restart": drop every connection, then build a new application on the same file.
    client.app.state.database.engine.dispose()  # type: ignore[attr-defined]
    with TestClient(make_app()) as restarted:
        assert restarted.get(f"/api/listings/{listing['id']}").json() == listing
        booked = restarted.get(f"/api/listings/{listing['id']}/availability").json()["booked"]
        assert booked == [
            {
                "check_in": check_in.isoformat(),
                "check_out": (check_in + timedelta(days=3)).isoformat(),
            }
        ]

        login(restarted, guest.id)
        assert restarted.get(f"/api/bookings/{booking['id']}").json() == booking
        assert restarted.get("/api/wishlist/ids").json() == {"ids": [listing["id"]]}
        # The dates are still blocked for everyone else.
        again = book(restarted, listing["id"], check_in, nights=3, expected_total_minor=1)
        assert again.json()["error"]["code"] == "dates_unavailable"
