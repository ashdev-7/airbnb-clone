"""One wishlist per user (plan §10.10). Saving and unsaving are idempotent."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.deps import ReadSession, WriteSession
from app.listings import repository as listings
from app.listings.models import Listing
from app.listings.schemas import ListingCard
from app.listings.service import listing_not_found, to_cards
from app.wishlist.models import WishlistItem


class WishlistService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def cards(self, user_id: int) -> list[ListingCard]:
        return to_cards(self._session, listings.saved_by(self._session, user_id))

    def ids(self, user_id: int) -> list[int]:
        """Saved listing ids, so the client can mark hearts without the listing responses
        becoming user-specific."""
        return list(
            self._session.scalars(
                select(WishlistItem.listing_id)
                .join(Listing, Listing.id == WishlistItem.listing_id)
                .where(listings.ACTIVE, WishlistItem.user_id == user_id)
                .order_by(WishlistItem.listing_id)
            )
        )

    def save(self, user_id: int, listing_id: int) -> None:
        if not listings.exists(self._session, listing_id):
            raise listing_not_found()
        # The composite primary key makes a second save a no-op.
        self._session.execute(
            insert(WishlistItem)
            .values(user_id=user_id, listing_id=listing_id, created_at=now_utc())
            .on_conflict_do_nothing()
        )

    def unsave(self, user_id: int, listing_id: int) -> None:
        self._session.execute(
            delete(WishlistItem).where(
                WishlistItem.user_id == user_id, WishlistItem.listing_id == listing_id
            )
        )


def _reader(session: ReadSession) -> WishlistService:
    return WishlistService(session)


def _writer(session: WriteSession) -> WishlistService:
    return WishlistService(session)


WishlistReader = Annotated[WishlistService, Depends(_reader)]
WishlistWriter = Annotated[WishlistService, Depends(_writer)]
