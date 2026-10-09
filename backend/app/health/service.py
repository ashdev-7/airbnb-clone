from typing import Annotated

from fastapi import Depends
from sqlalchemy import literal, select

from app.core.deps import ReadSession


class HealthService:
    def __init__(self, session: ReadSession) -> None:
        self._session = session

    def check(self) -> dict[str, str]:
        """Run a real query: "up" means the database answers, not just the process."""
        self._session.execute(select(literal(1))).scalar_one()
        return {"status": "ok", "database": "ok"}


HealthServiceDep = Annotated[HealthService, Depends(HealthService)]
