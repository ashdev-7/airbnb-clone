from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UtcDateTime


class User(Base):
    """A person. "Host" is not a column: a host is a user who owns a listing (plan §6.1)."""

    __tablename__ = "users"
    __table_args__ = (CheckConstraint("length(trim(name)) > 0", name="name_not_empty"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True)
    avatar_url: Mapped[str | None]
    bio: Mapped[str | None]
    # Demo accounts are the ones offered in the login modal.
    is_demo: Mapped[bool] = mapped_column(
        Boolean(create_constraint=True, name="is_demo_boolean"),
        default=False,
        server_default=text("0"),
    )
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
