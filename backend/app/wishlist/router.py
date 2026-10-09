from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.listings.schemas import ListingList
from app.users.deps import RequireUser
from app.wishlist.service import WishlistReader, WishlistWriter

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


class WishlistIds(BaseModel):
    ids: list[int]


@router.get("", response_model=ListingList)
def saved_listings(user: RequireUser, service: WishlistReader) -> ListingList:
    return ListingList(items=service.cards(user.id))


@router.get("/ids", response_model=WishlistIds)
def saved_ids(user: RequireUser, service: WishlistReader) -> WishlistIds:
    return WishlistIds(ids=service.ids(user.id))


@router.put("/{listing_id}", status_code=204)
def save(listing_id: int, user: RequireUser, service: WishlistWriter) -> Response:
    service.save(user.id, listing_id)
    return Response(status_code=204)


@router.delete("/{listing_id}", status_code=204)
def unsave(listing_id: int, user: RequireUser, service: WishlistWriter) -> Response:
    service.unsave(user.id, listing_id)
    return Response(status_code=204)
