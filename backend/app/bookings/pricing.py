"""The only place money is calculated (plan §10.4).

Integer arithmetic in paise throughout. Every amount is a whole number of rupees, so
the lines a guest sees always add up exactly to the total.
"""

from dataclasses import dataclass

PAISE_PER_RUPEE = 100
_BPS_DENOMINATOR = 10_000


@dataclass(frozen=True)
class PriceBreakdown:
    nights: int
    nightly_price_minor: int
    nights_total_minor: int
    cleaning_fee_minor: int
    service_fee_minor: int
    total_minor: int


def calculate_price(
    nightly_price_minor: int, cleaning_fee_minor: int, nights: int, service_fee_bps: int
) -> PriceBreakdown:
    """Price of a stay. The service fee is a share (in basis points) of nights plus
    cleaning, rounded half-up to a whole rupee."""
    if nights < 1:
        raise ValueError("A stay is at least one night")

    nights_total = nightly_price_minor * nights
    subtotal = nights_total + cleaning_fee_minor
    # fee in rupees = subtotal_paise × bps / (10,000 × 100), rounded half-up.
    rupee_divisor = _BPS_DENOMINATOR * PAISE_PER_RUPEE
    service_fee = ((subtotal * service_fee_bps + rupee_divisor // 2) // rupee_divisor) * (
        PAISE_PER_RUPEE
    )
    return PriceBreakdown(
        nights=nights,
        nightly_price_minor=nightly_price_minor,
        nights_total_minor=nights_total,
        cleaning_fee_minor=cleaning_fee_minor,
        service_fee_minor=service_fee,
        total_minor=subtotal + service_fee,
    )
