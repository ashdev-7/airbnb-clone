"""`npm run seed -- --check-images`: request every photo URL in the pool (plan §12).

A URL passes when it answers 200 with an image content type. The fetcher is a parameter
so the logic can be tested without the network.
"""

from collections.abc import Callable, Iterable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TIMEOUT_SECONDS = 20
WORKERS = 8

# (status, content type); status 0 means no response arrived.
Fetcher = Callable[[str], tuple[int, str]]


@dataclass(frozen=True)
class ImageFailure:
    url: str
    reason: str


def fetch(url: str) -> tuple[int, str]:
    request = Request(url, headers={"User-Agent": "AirStay seed image check"})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310 - https only
            return response.status, response.headers.get_content_type()
    except HTTPError as error:
        return error.code, ""
    except (URLError, TimeoutError, OSError):
        return 0, ""


def check_url(url: str, fetcher: Fetcher = fetch) -> ImageFailure | None:
    if not url.startswith("https://"):
        return ImageFailure(url, "not an https URL")
    status, content_type = fetcher(url)
    if status == 0:
        return ImageFailure(url, "no response")
    if status != 200:
        return ImageFailure(url, f"HTTP {status}")
    if not content_type.startswith("image/"):
        return ImageFailure(url, f"not an image ({content_type or 'no content type'})")
    return None


def check_images(urls: Iterable[str], fetcher: Fetcher = fetch) -> list[ImageFailure]:
    """Check every URL, a few at a time. Returns the failures, in the order of `urls`."""
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = pool.map(lambda url: check_url(url, fetcher), list(urls))
    return [failure for failure in results if failure is not None]
