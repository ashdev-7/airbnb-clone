from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    name: str
    avatar_url: str | None
    # Derived: a host is a user who owns a listing (plan §6.1).
    is_host: bool


class DemoAccountsOut(BaseModel):
    accounts: list[UserOut]


class MeOut(BaseModel):
    user: UserOut | None


class LoginIn(BaseModel):
    user_id: int
