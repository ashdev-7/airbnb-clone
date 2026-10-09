from fastapi import APIRouter, Request, Response

from app.users.deps import SESSION_USER_KEY, CurrentUser
from app.users.schemas import DemoAccountsOut, LoginIn, MeOut
from app.users.service import UserServiceDep

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/demo-accounts", response_model=DemoAccountsOut)
def demo_accounts(users: UserServiceDep) -> DemoAccountsOut:
    return DemoAccountsOut(accounts=users.demo_accounts())


@router.post("/login", response_model=MeOut)
def login(body: LoginIn, request: Request, users: UserServiceDep) -> MeOut:
    user = users.demo_account(body.user_id)
    request.session.clear()
    request.session[SESSION_USER_KEY] = user.id
    return MeOut(user=user)


@router.post("/logout", status_code=204)
def logout(request: Request) -> Response:
    request.session.clear()
    return Response(status_code=204)


@router.get("/me", response_model=MeOut)
def me(user: CurrentUser) -> MeOut:
    return MeOut(user=user)
