from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.listings.host_service import HostListingReader, HostListingWriter
from app.listings.schemas import (
    ListingCreate,
    ListingDetail,
    ListingList,
    ListingPage,
    ListingSummary,
    ListingUpdate,
    LocationsOut,
    MetaOut,
    PagedSearchParams,
    SearchParams,
)
from app.listings.service import ListingServiceDep
from app.users.deps import RequireUser

router = APIRouter(tags=["listings"])

# --- anyone ------------------------------------------------------------------------------


@router.get("/meta", response_model=MetaOut)
def meta(service: ListingServiceDep) -> MetaOut:
    return service.meta()


@router.get("/locations", response_model=LocationsOut)
def locations(
    service: ListingServiceDep, q: Annotated[str, Query(max_length=100)] = ""
) -> LocationsOut:
    return LocationsOut(items=service.locations(q))


@router.get("/listings", response_model=ListingPage)
def search(
    service: ListingServiceDep, params: Annotated[PagedSearchParams, Query()]
) -> ListingPage:
    return service.search(params)


@router.get("/listings/summary", response_model=ListingSummary)
def summary(service: ListingServiceDep, params: Annotated[SearchParams, Query()]) -> ListingSummary:
    return service.summary(params)


@router.get("/listings/{listing_id}", response_model=ListingDetail)
def detail(listing_id: int, service: ListingServiceDep) -> ListingDetail:
    return service.detail(listing_id)


# --- the signed-in host ------------------------------------------------------------------


@router.post("/listings", response_model=ListingDetail, status_code=201)
def create(body: ListingCreate, user: RequireUser, service: HostListingWriter) -> ListingDetail:
    return service.create(user.id, body)


@router.patch("/listings/{listing_id}", response_model=ListingDetail)
def update(
    listing_id: int, body: ListingUpdate, user: RequireUser, service: HostListingWriter
) -> ListingDetail:
    return service.update(user.id, listing_id, body)


@router.delete("/listings/{listing_id}", status_code=204)
def remove(listing_id: int, user: RequireUser, service: HostListingWriter) -> Response:
    service.remove(user.id, listing_id)
    return Response(status_code=204)


@router.get("/hosting/listings", response_model=ListingList)
def my_listings(user: RequireUser, service: HostListingReader) -> ListingList:
    return ListingList(items=service.mine(user.id))
