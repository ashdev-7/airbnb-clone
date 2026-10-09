"""Who is calling (plan §10.9). Identity comes from the signed session cookie and from
nowhere else: no endpoint reads a user id from a request body or query."""

from typing import Annotated

from fastapi import Depends, Request

from app.core.errors import unauthenticated
from app.users.schemas import UserOut
from app.users.service import UserServiceDep

SESSION_USER_KEY = "user_id"


def current_user(request: Request, users: UserServiceDep) -> UserOut | None:
    """The signed-in user, or None. A cookie naming a user that no longer exists is cleared."""
    user_id = request.session.get(SESSION_USER_KEY)
    if not isinstance(user_id, int):
        return None
    user = users.get(user_id)
    if user is None:
        request.session.clear()
    return user


def require_user(user: Annotated[UserOut | None, Depends(current_user)]) -> UserOut:
    if user is None:
        raise unauthenticated()
    return user


CurrentUser = Annotated[UserOut | None, Depends(current_user)]
RequireUser = Annotated[UserOut, Depends(require_user)]
