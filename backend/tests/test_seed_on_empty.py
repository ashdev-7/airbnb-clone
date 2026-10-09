"""SEED_ON_EMPTY: the first start against an empty database loads the sample data; a
later start leaves the data alone (deployment, plan §18)."""

from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_an_empty_database_is_seeded_once(tmp_path: Path) -> None:
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'deploy.db'}", secret_key="test", seed_on_empty=True
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/listings").json()["total"] == 120
        client.post("/api/auth/login", json={"user_id": 5})
        client.put("/api/wishlist/3")
    with TestClient(create_app(settings)) as again:
        again.post("/api/auth/login", json={"user_id": 5})
        assert again.get("/api/wishlist/ids").json() == {"ids": [3]}
