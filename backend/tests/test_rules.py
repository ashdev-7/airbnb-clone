"""The pure rules the seed already depends on: overlap, pricing and today's date.
Phase 4 adds the remaining cases when the booking flow is built on them."""

from datetime import UTC, date, datetime

import pytest

from app.bookings.availability import overlaps
from app.bookings.pricing import calculate_price
from app.core.clock import today

EXISTING = (date(2026, 10, 10), date(2026, 10, 15))


@pytest.mark.parametrize(
    ("check_in", "check_out", "conflict"),
    [
        (date(2026, 10, 15), date(2026, 10, 20), False),  # starts on the check-out day
        (date(2026, 10, 5), date(2026, 10, 10), False),  # ends on the check-in day
        (date(2026, 10, 14), date(2026, 10, 16), True),
        (date(2026, 10, 9), date(2026, 10, 11), True),
        (date(2026, 10, 11), date(2026, 10, 13), True),  # inside
        (date(2026, 10, 8), date(2026, 10, 18), True),  # contains
    ],
)
def test_overlap_fixture_table(check_in: date, check_out: date, conflict: bool) -> None:
    assert overlaps(check_in, check_out, *EXISTING) is conflict
    assert overlaps(*EXISTING, check_in, check_out) is conflict


def test_pricing_example_from_the_plan() -> None:
    price = calculate_price(450_000, 120_000, nights=5, service_fee_bps=1500)
    assert price.nights_total_minor == 2_250_000
    assert price.cleaning_fee_minor == 120_000
    assert price.service_fee_minor == 355_500
    assert price.total_minor == 2_725_500


@pytest.mark.parametrize(
    ("nightly_minor", "expected_fee_minor"),
    [
        (100_000, 15_000),  # ₹1,000 → exactly ₹150
        (100_300, 15_000),  # ₹1,003 → ₹150.45, rounds down
        (101_000, 15_200),  # ₹1,010 → ₹151.50, half rounds up
        (100_700, 15_100),  # ₹1,007 → ₹151.05, rounds down
        (100_900, 15_100),  # ₹1,009 → ₹151.35, rounds down
        (101_100, 15_200),  # ₹1,011 → ₹151.65, rounds up
    ],
)
def test_service_fee_rounds_half_up_to_a_whole_rupee(
    nightly_minor: int, expected_fee_minor: int
) -> None:
    price = calculate_price(nightly_minor, 0, nights=1, service_fee_bps=1500)
    assert price.service_fee_minor == expected_fee_minor
    assert price.service_fee_minor % 100 == 0
    assert price.total_minor == nightly_minor + expected_fee_minor


def test_pricing_rejects_a_stay_without_nights() -> None:
    with pytest.raises(ValueError):
        calculate_price(100_000, 0, nights=0, service_fee_bps=1500)


def test_today_is_the_date_in_the_business_timezone() -> None:
    # 20:00 UTC on the 9th is already 01:30 on the 10th in India.
    instant = datetime(2026, 10, 9, 20, 0, tzinfo=UTC)
    assert today("Asia/Kolkata", instant) == date(2026, 10, 10)
    assert today("UTC", instant) == date(2026, 10, 9)
    assert today("America/Los_Angeles", instant) == date(2026, 10, 9)
