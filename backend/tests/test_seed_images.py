"""The image checker's logic, without the network.

The real check is `npm run seed -- --check-images`.
"""

from app.seed.images import check_images, check_url
from app.seed.photos import COVERS, all_photo_urls

RESPONSES = {
    "https://img.test/ok.jpg": (200, "image/jpeg"),
    "https://img.test/gone.jpg": (404, ""),
    "https://img.test/page": (200, "text/html"),
    "https://img.test/down.jpg": (0, ""),
}


def fake_fetch(url: str) -> tuple[int, str]:
    return RESPONSES[url]


def test_a_good_image_passes() -> None:
    assert check_url("https://img.test/ok.jpg", fake_fetch) is None


def test_failures_are_reported_with_a_reason_in_input_order() -> None:
    failures = check_images([*RESPONSES, "http://img.test/plain.jpg"], fake_fetch)
    assert [(failure.url, failure.reason) for failure in failures] == [
        ("https://img.test/gone.jpg", "HTTP 404"),
        ("https://img.test/page", "not an image (text/html)"),
        ("https://img.test/down.jpg", "no response"),
        ("http://img.test/plain.jpg", "not an https URL"),
    ]


def test_the_pool_is_https_without_duplicates_and_covers_every_property_type() -> None:
    urls = all_photo_urls()
    assert len(urls) == len(set(urls)) > 150
    assert all(url.startswith("https://images.unsplash.com/photo-") for url in urls)
    assert set(COVERS) == {
        "house",
        "apartment",
        "guesthouse",
        "cabin",
        "villa",
        "cottage",
        "tiny-home",
        "treehouse",
    }
