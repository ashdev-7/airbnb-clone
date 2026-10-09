from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

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


class ReviewCreate(BaseModel):
    """There is no author here: the author is the guest of the stay."""

    model_config = ConfigDict(extra="forbid")

    rating: int = Field(ge=1, le=5)
    comment: str = Field(max_length=2000)

    @field_validator("comment")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Write a few words about your stay.")
        return value


class ReviewedListing(BaseModel):
    id: int
    title: str
    city: str
    # True once the host has removed the listing: shown unlinked.
    removed: bool


class MyReview(BaseModel):
    """A review with the listing it is about, for the page of its author."""

    id: int
    booking_id: int
    rating: int
    comment: str
    created_at: datetime
    listing: ReviewedListing


class MyReviews(BaseModel):
    items: list[MyReview]
