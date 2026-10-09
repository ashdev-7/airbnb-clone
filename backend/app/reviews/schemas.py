from datetime import datetime

from pydantic import BaseModel

REVIEWS_PAGE_SIZE = 10
MAX_REVIEWS_PAGE_SIZE = 50


class ReviewAuthor(BaseModel):
    name: str
    avatar_url: str | None


class ReviewOut(BaseModel):
    id: int
    rating: int
    comment: str
    created_at: datetime
    author: ReviewAuthor


class ReviewPage(BaseModel):
    items: list[ReviewOut]
    page: int
    page_size: int
    total: int
    total_pages: int
    # None until the listing has three reviews (plan §10.7).
    rating_average: float | None
