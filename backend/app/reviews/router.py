from typing import Annotated

from fastapi import APIRouter, Query

from app.reviews.schemas import MAX_REVIEWS_PAGE_SIZE, REVIEWS_PAGE_SIZE, ReviewPage
from app.reviews.service import ReviewServiceDep

router = APIRouter(tags=["reviews"])


@router.get("/listings/{listing_id}/reviews", response_model=ReviewPage)
def listing_reviews(
    listing_id: int,
    service: ReviewServiceDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_REVIEWS_PAGE_SIZE)] = REVIEWS_PAGE_SIZE,
) -> ReviewPage:
    return service.for_listing(listing_id, page, page_size)
