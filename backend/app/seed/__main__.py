"""Command line for the seed:

npm run seed                      rebuild the database and load the seed
npm run seed -- --check-images    request every photo URL instead
"""

import argparse
import sys

from app.core.clock import today
from app.core.config import Settings
from app.db.engine import create_db_engine
from app.db.session import Database
from app.seed.images import check_images
from app.seed.loader import seed_database
from app.seed.photos import all_photo_urls


def _check_images() -> int:
    urls = all_photo_urls()
    print(f"Checking {len(urls)} photo URLs ...")
    failures = check_images(urls)
    for failure in failures:
        print(f"  FAILED ({failure.reason}): {failure.url}")
    print(f"{len(urls) - len(failures)} passed, {len(failures)} failed.")
    return 1 if failures else 0


def _seed() -> int:
    settings = Settings()
    database = Database(create_db_engine(settings.database_url, settings.sqlite_busy_timeout_ms))
    try:
        seed_date = today(settings.app_timezone)
        counts = seed_database(database, seed_date, settings.service_fee_bps)
    finally:
        database.engine.dispose()
    print(f"Seeded {settings.database_url} for {seed_date.isoformat()}:")
    for kind, count in counts.items():
        print(f"  {count:>5}  {kind}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="npm run seed --", description=__doc__)
    parser.add_argument(
        "--check-images", action="store_true", help="request every photo URL; change nothing"
    )
    arguments = parser.parse_args()
    return _check_images() if arguments.check_images else _seed()


if __name__ == "__main__":
    sys.exit(main())
