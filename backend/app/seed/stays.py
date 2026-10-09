"""Seed builders for bookings and reviews (plan §12).

Every stay is placed relative to `today`, so there are always past, current and
upcoming trips. Prices come from the pricing module and every confirmed stay is
checked with the overlap rule before it is added; the database triggers check again.
"""

import random
import uuid
from datetime import date, timedelta

from app.bookings.availability import overlaps
from app.bookings.models import STATUS_CANCELLED, STATUS_CONFIRMED, Booking
from app.bookings.pricing import calculate_price
from app.listings.models import Listing
from app.reviews.models import Review
from app.seed import data
from app.seed.catalogue import People, moment
from app.users.models import User

# Listings by index (see catalogue.build_listings).
FULLY_BOOKED_LISTING = 1  # the fourth demo host's only listing
BACK_TO_BACK_LISTING = 3
CURRENT_STAY_LISTINGS = (12, 25)
FEW_REVIEW_LISTINGS = (5, 17, 33, 48)  # fewer than three reviews: shown as "New"
MEERA_PAST_LISTINGS = range(2, 6)  # the first demo guest: past, current and upcoming trips
ARJUN_PAST_LISTINGS = range(6, 10)  # the second demo guest: past trips only
REVIEW_WINDOW_DAYS = 14

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I
_USUAL_RATINGS = ((5, 4, 3, 2, 1), (60, 28, 9, 2, 1))
_TOP_RATINGS = ((5, 4), (96, 4))


class StayBuilder:
    def __init__(
        self,
        rng: random.Random,
        today: date,
        service_fee_bps: int,
        people: People,
        listings: list[Listing],
        pets_allowed: set[Listing],
    ) -> None:
        self.rng = rng
        self.today = today
        self.service_fee_bps = service_fee_bps
        self.people = people
        self.listings = listings
        self.pets_allowed = pets_allowed
        self.bookings: list[Booking] = []
        self.reviews: list[Review] = []
        self._codes: set[str] = set()
        self._meera, self._arjun, _ = people.demo_guests

    def build(self) -> None:
        for index, listing in enumerate(self.listings):
            self._past_stays(index, listing)
        self._current_stays()
        self._upcoming_stays()
        self._back_to_back_and_cancelled()
        self._nearly_full_next_month()

    # --- one booking ----------------------------------------------------------------------

    def _code(self) -> str:
        while True:
            code = "".join(self.rng.choices(_CODE_ALPHABET, k=10))
            if code not in self._codes:
                self._codes.add(code)
                return code

    def _book(
        self,
        listing: Listing,
        guest: User,
        check_in: date,
        check_out: date,
        status: str = STATUS_CONFIRMED,
    ) -> Booking:
        if status == STATUS_CONFIRMED:
            for other in self.bookings:
                if other.listing is listing and other.status == STATUS_CONFIRMED:
                    assert not overlaps(check_in, check_out, other.check_in, other.check_out)

        price = calculate_price(
            listing.price_per_night_minor,
            listing.cleaning_fee_minor,
            (check_out - check_in).days,
            self.service_fee_bps,
        )
        adults = self.rng.randint(1, min(listing.max_guests, 4))
        code = self._code()
        booking = Booking(
            confirmation_code=code,
            listing=listing,
            guest=guest,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            children=self.rng.randint(0, min(2, listing.max_guests - adults)),
            infants=self.rng.choice((0, 0, 0, 1)),
            pets=self.rng.choice((0, 1)) if listing in self.pets_allowed else 0,
            nightly_price_minor=price.nightly_price_minor,
            cleaning_fee_minor=price.cleaning_fee_minor,
            service_fee_minor=price.service_fee_minor,
            total_minor=price.total_minor,
            status=status,
            payment_reference=f"seed_{code}",
            idempotency_key=str(uuid.UUID(int=self.rng.getrandbits(128), version=4)),
            created_at=moment(check_in - timedelta(days=self.rng.randint(3, 60))),
        )
        self.bookings.append(booking)
        return booking

    def _other_guest(self) -> User:
        return self.rng.choice(self.people.others)

    # --- the shapes plan §12 asks for -----------------------------------------------------

    def _past_stays(self, index: int, listing: Listing) -> None:
        """Completed stays, walking back from today, most of them reviewed."""
        if index in FEW_REVIEW_LISTINGS:
            review_count = self.rng.randint(0, 2)
        else:
            review_count = int(self.rng.triangular(3, 40, 8))
        ratings, weights = _TOP_RATINGS if index % 4 == 0 else _USUAL_RATINGS

        check_out = self.today - timedelta(days=self.rng.randint(2, 9))
        for number in range(review_count + self.rng.randint(0, 2)):
            check_in = check_out - timedelta(days=self.rng.randint(1, 6))
            if number == 0 and index in MEERA_PAST_LISTINGS:
                guest = self._meera
            elif number == 0 and index in ARJUN_PAST_LISTINGS:
                guest = self._arjun
            else:
                guest = self._other_guest()
            booking = self._book(listing, guest, check_in, check_out)

            if number < review_count:
                rating = self.rng.choices(ratings, weights)[0]
                written = check_out + timedelta(days=self.rng.randint(1, REVIEW_WINDOW_DAYS - 1))
                self.reviews.append(
                    Review(
                        booking=booking,
                        rating=rating,
                        comment=self.rng.choice(data.REVIEWS_BY_RATING[rating]),
                        created_at=moment(min(written, self.today)),
                    )
                )
            # A gap of zero makes the next (earlier) stay back-to-back with this one.
            check_out = check_in - timedelta(days=self.rng.randint(0, 12))

    def _current_stays(self) -> None:
        guests = (self._meera, self._other_guest())
        for index, guest in zip(CURRENT_STAY_LISTINGS, guests, strict=True):
            self._book(
                self.listings[index],
                guest,
                self.today - timedelta(days=1),
                self.today + timedelta(days=2),
            )

    def _upcoming_stays(self) -> None:
        special = {FULLY_BOOKED_LISTING, BACK_TO_BACK_LISTING, *CURRENT_STAY_LISTINGS}
        chosen = [n for n in range(0, len(self.listings), 3) if n not in special]
        for position, index in enumerate(chosen):
            check_in = self.today + timedelta(days=self.rng.randint(3, 45))
            guest = self._meera if position < 3 else self._other_guest()
            self._book(
                self.listings[index],
                guest,
                check_in,
                check_in + timedelta(days=self.rng.randint(2, 6)),
            )

    def _back_to_back_and_cancelled(self) -> None:
        """Two stays that share a day, and a cancelled stay across both of them."""
        listing = self.listings[BACK_TO_BACK_LISTING]
        first, second, third = (self.today + timedelta(days=d) for d in (10, 13, 16))
        self._book(listing, self._other_guest(), first, second)
        self._book(listing, self._other_guest(), second, third)
        self._book(
            listing,
            self._meera,
            first + timedelta(days=1),
            second + timedelta(days=1),
            status=STATUS_CANCELLED,
        )

    def _nearly_full_next_month(self) -> None:
        """One listing booked for all of next month except two nights."""
        listing = self.listings[FULLY_BOOKED_LISTING]
        first_of_this_month = self.today.replace(day=1)
        month_start = (first_of_this_month + timedelta(days=32)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)

        check_in = month_start
        stays = 0
        while check_in < month_end:
            nights = min(self.rng.randint(3, 5), (month_end - check_in).days)
            check_out = check_in + timedelta(days=nights)
            self._book(listing, self._other_guest(), check_in, check_out)
            stays += 1
            check_in = check_out + timedelta(days=2 if stays == 2 else 0)
