"""Plan §10.9: mocked identity with real sessions."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.session import Database
from tests.conftest import AppFactory, Build
from tests.factories import Factory, login


def test_demo_accounts_lists_only_demo_users_with_their_host_status(
    client: TestClient, build: Build
) -> None:
    with build() as f:
        host = f.user("Ananya")
        guest = f.user("Meera")
        f.user("Not offered", is_demo=False)
        f.listing(host)

    response = client.get("/api/auth/demo-accounts")
    assert response.status_code == 200
    assert response.json() == {
        "accounts": [
            {"id": host.id, "name": "Ananya", "avatar_url": None, "is_host": True},
            {"id": guest.id, "name": "Meera", "avatar_url": None, "is_host": False},
        ]
    }


def test_me_is_null_when_signed_out(client: TestClient) -> None:
    assert client.get("/api/auth/me").json() == {"user": None}


def test_login_starts_a_session_and_logout_ends_it(client: TestClient, build: Build) -> None:
    with build() as f:
        user = f.user("Meera")

    response = client.post("/api/auth/login", json={"user_id": user.id})
    assert response.status_code == 200
    assert response.json()["user"]["name"] == "Meera"
    assert client.get("/api/auth/me").json()["user"]["id"] == user.id

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").json() == {"user": None}


def test_session_cookie_is_http_only_and_same_site_lax(client: TestClient, build: Build) -> None:
    with build() as f:
        user = f.user()
    response = client.post("/api/auth/login", json={"user_id": user.id})
    cookie = response.headers["set-cookie"].lower()
    assert cookie.startswith("airstay_session=")
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert "max-age=1209600" in cookie  # 14 days
    assert "secure" not in cookie  # local development is plain http


def test_session_cookie_is_secure_when_configured(make_app: AppFactory) -> None:
    app: FastAPI = make_app(cookie_secure=True)
    with app.state.database.write_session() as session:
        user = Factory(session).user()
    with TestClient(app, base_url="https://testserver") as secure_client:
        response = secure_client.post("/api/auth/login", json={"user_id": user.id})
    assert "secure" in response.headers["set-cookie"].lower()


def test_login_accepts_only_demo_accounts(client: TestClient, build: Build) -> None:
    with build() as f:
        private = f.user("Private", is_demo=False)

    for user_id in (private.id, 9999):
        response = client.post("/api/auth/login", json={"user_id": user_id})
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "demo_account_not_found"
    assert client.get("/api/auth/me").json() == {"user": None}


def test_login_rejects_a_malformed_body(client: TestClient) -> None:
    for body in ({}, {"user_id": "meera"}, {"name": "Meera"}):
        assert client.post("/api/auth/login", json=body).status_code == 422


def test_a_tampered_cookie_is_ignored(client: TestClient, build: Build) -> None:
    with build() as f:
        user = f.user()
    login(client, user.id)
    client.cookies.set("airstay_session", "forged-value")
    assert client.get("/api/auth/me").json() == {"user": None}


def test_a_session_for_a_deleted_user_is_cleared(
    client: TestClient, build: Build, database: Database
) -> None:
    with build() as f:
        user = f.user()
    login(client, user.id)
    with database.engine.connect() as connection:
        connection.exec_driver_sql("DELETE FROM users WHERE id = ?", (user.id,))
        connection.commit()

    assert client.get("/api/auth/me").json() == {"user": None}
    assert client.get("/api/wishlist").status_code == 401


def test_endpoints_for_signed_in_users_answer_401_when_signed_out(client: TestClient) -> None:
    for method, path in (
        ("POST", "/api/listings"),
        ("PATCH", "/api/listings/1"),
        ("DELETE", "/api/listings/1"),
        ("GET", "/api/hosting/listings"),
        ("GET", "/api/wishlist"),
        ("GET", "/api/wishlist/ids"),
        ("PUT", "/api/wishlist/1"),
        ("DELETE", "/api/wishlist/1"),
    ):
        response = client.request(method, path, json={})
        assert response.status_code == 401, (method, path)
        assert response.json()["error"]["code"] == "unauthenticated"
