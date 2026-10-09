"""Guest limits (plan §10.8): the authoritative copy, served to the frontend by /api/meta.

Values and their sources are recorded in docs/parity-notes.md.
"""

MIN_ADULTS = 1  # provisional (OURS)
MAX_GUESTS = 16  # adults + children, capture A5
MAX_INFANTS = 5  # capture A5
MAX_PETS = 5  # provisional (OURS): no capture shows the pets limit


def counted_guests(adults: int, children: int) -> int:
    """Guests who count toward a listing's maximum. Infants and pets do not (capture C3)."""
    return adults + children


def limits() -> dict[str, int]:
    return {
        "min_adults": MIN_ADULTS,
        "max_guests": MAX_GUESTS,
        "max_infants": MAX_INFANTS,
        "max_pets": MAX_PETS,
    }
