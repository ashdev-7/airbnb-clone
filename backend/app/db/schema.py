"""The whole schema in one place: importing this module registers every table.

There is one schema version, created from the models (plan §8.4). `create_schema` is
safe to call on every start; `rebuild_schema` is what `npm run seed` uses.
"""

from sqlalchemy import Engine

from app.bookings import models as _bookings  # noqa: F401
from app.db.base import Base
from app.listings import models as _listings  # noqa: F401
from app.reviews import models as _reviews  # noqa: F401
from app.users import models as _users  # noqa: F401
from app.wishlist import models as _wishlist  # noqa: F401


def create_schema(engine: Engine) -> None:
    """Create whatever is missing: tables, indexes and, with the bookings table, its triggers."""
    Base.metadata.create_all(engine)


def rebuild_schema(engine: Engine) -> None:
    """Drop every table (and its data) and create the schema again."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
