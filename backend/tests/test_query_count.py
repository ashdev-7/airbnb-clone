"""Plan §10.6: a page of results costs a fixed, small number of statements, never one
per card."""

from collections.abc import Iterator
from contextlib import contextmanager

from fastapi.testclient import TestClient
from sqlalchemy import event

from app.db.session import Database
from tests.conftest import Build
from tests.factories import login

TRANSACTION_CONTROL = ("BEGIN", "COMMIT", "ROLLBACK")


@contextmanager
def counted(database: Database) -> Iterator[list[str]]:
    statements: list[str] = []

    def record(_conn, _cursor, statement, *_rest) -> None:  # type: ignore[no-untyped-def]
        if not statement.startswith(TRANSACTION_CONTROL):
            statements.append(statement)

    event.listen(database.engine, "before_cursor_execute", record)
    try:
        yield statements
    finally:
        event.remove(database.engine, "before_cursor_execute", record)


def populate(build: Build, listings: int) -> int:
    """`listings` listings, each with photos, amenities and reviews. Returns a guest's id."""
    with build() as f:
        host, guest = f.user("Host"), f.user("Guest")
        for _ in range(listings):
            listing = f.listing(host, amenities=("wifi", "pool"), photos=6)
            for _ in range(3):
                f.review(listing, guest)
        return guest.id


def test_search_uses_three_statements_whatever_the_page_holds(
    client: TestClient, database: Database, build: Build
) -> None:
    populate(build, 3)
    with counted(database) as few:
        assert len(client.get("/api/listings").json()["items"]) == 3

    populate(build, 30)
    with counted(database) as many:
        response = client.get(
            "/api/listings",
            params={
                "location": "Jaipur",
                "amenity": ["wifi", "pool"],
                "adults": 2,
                "page_size": 30,
            },
        )
        assert len(response.json()["items"]) == 30

    # A count, the page with types and ratings, and one statement for all photos.
    assert len(few) == len(many) == 3


def test_hosting_and_wishlist_lists_do_not_grow_with_their_length(
    client: TestClient, database: Database, build: Build
) -> None:
    guest_id = populate(build, 12)
    login(client, guest_id)
    for item in client.get("/api/listings").json()["items"]:
        client.put(f"/api/wishlist/{item['id']}")

    with counted(database) as statements:
        assert len(client.get("/api/wishlist").json()["items"]) == 12
    # The signed-in user, the saved listings, their photos.
    assert len(statements) == 3
