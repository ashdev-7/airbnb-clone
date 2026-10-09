from fastapi import APIRouter
from pydantic import BaseModel

from app.health.service import HealthServiceDep

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    database: str


@router.get("/health", response_model=HealthResponse)
def health(service: HealthServiceDep) -> dict[str, str]:
    return service.check()
