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


def party_error(
    adults: int, children: int, infants: int, pets: int, max_guests: int, pets_allowed: bool
) -> str | None:
    """Why this group cannot stay at a listing, or None when it can (plan §10.8)."""
    if adults < MIN_ADULTS:
        return "At least one adult is required."
    if children < 0 or infants < 0 or pets < 0:
        return "Guest counts cannot be negative."
    if counted_guests(adults, children) > max_guests:
        return f"This place has a maximum of {max_guests} guests, not including infants."
    if infants > MAX_INFANTS:
        return f"At most {MAX_INFANTS} infants."
    if pets > MAX_PETS:
        return f"At most {MAX_PETS} pets."
    if pets and not pets_allowed:
        return "This place does not allow pets."
    return None


def limits() -> dict[str, int]:
    return {
        "min_adults": MIN_ADULTS,
        "max_guests": MAX_GUESTS,
        "max_infants": MAX_INFANTS,
        "max_pets": MAX_PETS,
    }
