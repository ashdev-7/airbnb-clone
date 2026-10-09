"""Mock identity (plan §10.9): demo accounts only, no credentials."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.deps import ReadSession
from app.core.errors import AppError
from app.listings.models import Listing
from app.users.models import User
from app.users.schemas import UserOut


class UserService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _users(self, *conditions: object) -> list[UserOut]:
        is_host = exists().where(Listing.host_id == User.id, Listing.deleted_at.is_(None))
        rows = self._session.execute(
            select(User.id, User.name, User.avatar_url, is_host.label("is_host"))
            .where(*conditions)  # type: ignore[arg-type]
            .order_by(User.id)
        )
        return [
            UserOut(id=row.id, name=row.name, avatar_url=row.avatar_url, is_host=row.is_host)
            for row in rows
        ]

    def demo_accounts(self) -> list[UserOut]:
        return self._users(User.is_demo)

    def get(self, user_id: int) -> UserOut | None:
        users = self._users(User.id == user_id)
        return users[0] if users else None

    def demo_account(self, user_id: int) -> UserOut:
        """The account to sign in as. Only demo accounts can be used."""
        users = self._users(User.id == user_id, User.is_demo)
        if not users:
            raise AppError("demo_account_not_found", 404, "That account cannot be used to sign in.")
        return users[0]


def _user_service(session: ReadSession) -> UserService:
    return UserService(session)


UserServiceDep = Annotated[UserService, Depends(_user_service)]
