"""Static seed content (plan §12). Everything here is written for this project."""

from typing import NamedTuple

PROPERTY_TYPES: tuple[tuple[str, str], ...] = (
    ("house", "House"),
    ("apartment", "Apartment"),
    ("guesthouse", "Guesthouse"),
    ("cabin", "Cabin"),
    ("villa", "Villa"),
    ("cottage", "Cottage"),
    ("tiny-home", "Tiny home"),
    ("treehouse", "Treehouse"),
)

PETS_ALLOWED = "pets-allowed"

# (slug, name, category). The categories are the amenity groups of REF-S1.
AMENITIES: tuple[tuple[str, str, str], ...] = (
    ("hot-water", "Hot water", "bathroom"),
    ("hair-dryer", "Hair dryer", "bathroom"),
    ("bathtub", "Bathtub", "bathroom"),
    ("essentials", "Towels and bed linen", "bedroom_laundry"),
    ("washing-machine", "Washing machine", "bedroom_laundry"),
    ("iron", "Iron", "bedroom_laundry"),
    ("tv", "TV", "entertainment"),
    ("board-games", "Board games", "entertainment"),
    ("cot", "Cot", "family"),
    ("high-chair", "High chair", "family"),
    ("air-conditioning", "Air conditioning", "heating_cooling"),
    ("heating", "Heating", "heating_cooling"),
    ("ceiling-fan", "Ceiling fan", "heating_cooling"),
    ("indoor-fireplace", "Indoor fireplace", "heating_cooling"),
    ("smoke-alarm", "Smoke alarm", "home_safety"),
    ("first-aid-kit", "First aid kit", "home_safety"),
    ("fire-extinguisher", "Fire extinguisher", "home_safety"),
    ("wifi", "Wifi", "internet_office"),
    ("dedicated-workspace", "Dedicated workspace", "internet_office"),
    ("kitchen", "Kitchen", "kitchen_dining"),
    ("refrigerator", "Refrigerator", "kitchen_dining"),
    ("microwave", "Microwave", "kitchen_dining"),
    ("coffee-maker", "Coffee maker", "kitchen_dining"),
    ("dining-table", "Dining table", "kitchen_dining"),
    ("beach-access", "Beach access", "location"),
    ("lake-access", "Lake access", "location"),
    ("mountain-view", "Mountain view", "location"),
    ("pool", "Pool", "outdoor"),
    ("garden", "Garden", "outdoor"),
    ("balcony", "Balcony", "outdoor"),
    ("bbq-grill", "Barbecue grill", "outdoor"),
    ("free-parking", "Free parking on premises", "parking_facilities"),
    ("lift", "Lift", "parking_facilities"),
    ("gym", "Gym", "parking_facilities"),
    (PETS_ALLOWED, "Pets allowed", "parking_facilities"),
)

# Amenities nearly every home has, and the ones that depend on the place.
COMMON_AMENITIES = ("wifi", "hot-water", "essentials", "kitchen", "smoke-alarm")
OPTIONAL_AMENITIES = tuple(
    slug
    for slug, _, category in AMENITIES
    if slug not in COMMON_AMENITIES and category != "location"
)


class Destination(NamedTuple):
    city: str
    state: str
    latitude: float
    longitude: float
    setting: str  # a phrase for descriptions
    location_amenity: str | None
    property_types: tuple[str, ...]


DESTINATIONS: tuple[Destination, ...] = (
    Destination(
        "Candolim",
        "Goa",
        15.5180,
        73.7620,
        "a short walk from the beach",
        "beach-access",
        ("villa", "house", "apartment", "guesthouse", "cottage"),
    ),
    Destination(
        "Manali",
        "Himachal Pradesh",
        32.2432,
        77.1892,
        "among apple orchards and pines",
        "mountain-view",
        ("cabin", "cottage", "treehouse", "house", "tiny-home"),
    ),
    Destination(
        "Jaipur",
        "Rajasthan",
        26.9124,
        75.7873,
        "close to the old city's bazaars",
        None,
        ("house", "apartment", "villa", "guesthouse", "apartment"),
    ),
    Destination(
        "Udaipur",
        "Rajasthan",
        24.5854,
        73.7125,
        "near the lakes and the old ghats",
        "lake-access",
        ("villa", "guesthouse", "house", "apartment", "villa"),
    ),
    Destination(
        "Munnar",
        "Kerala",
        10.0889,
        77.0595,
        "surrounded by tea estates",
        "mountain-view",
        ("cottage", "treehouse", "cabin", "villa", "tiny-home"),
    ),
    Destination(
        "Coorg",
        "Karnataka",
        12.4244,
        75.7382,
        "inside a working coffee plantation",
        "mountain-view",
        ("cottage", "villa", "treehouse", "cabin", "guesthouse"),
    ),
    Destination(
        "Rishikesh",
        "Uttarakhand",
        30.0869,
        78.2676,
        "above the river in the foothills",
        "mountain-view",
        ("guesthouse", "cabin", "tiny-home", "cottage", "apartment"),
    ),
    Destination(
        "Mumbai",
        "Maharashtra",
        19.0760,
        72.8777,
        "minutes from cafés and the sea face",
        None,
        ("apartment", "apartment", "house", "guesthouse", "apartment"),
    ),
    Destination(
        "Bengaluru",
        "Karnataka",
        12.9716,
        77.5946,
        "on a leafy residential street",
        None,
        ("apartment", "house", "villa", "tiny-home", "apartment"),
    ),
    Destination(
        "Darjeeling",
        "West Bengal",
        27.0410,
        88.2663,
        "on a ridge facing the mountains",
        "mountain-view",
        ("cottage", "cabin", "guesthouse", "house", "treehouse"),
    ),
    Destination(
        "Shimla",
        "Himachal Pradesh",
        31.1048,
        77.1734,
        "on a quiet cedar-covered slope",
        "mountain-view",
        ("cottage", "cabin", "house", "tiny-home", "villa"),
    ),
    Destination(
        "Alappuzha",
        "Kerala",
        9.4981,
        76.3388,
        "beside the backwaters",
        "lake-access",
        ("villa", "house", "guesthouse", "cottage", "treehouse"),
    ),
)

COUNTRY = "India"


class TypeProfile(NamedTuple):
    """How a property type is sized and priced: (low, high) ranges, prices in rupees."""

    noun: str
    nightly_rupees: tuple[int, int]
    max_guests: tuple[int, int]


TYPE_PROFILES: dict[str, TypeProfile] = {
    "house": TypeProfile("house", (4_000, 25_000), (4, 10)),
    "apartment": TypeProfile("apartment", (2_000, 9_000), (2, 6)),
    "guesthouse": TypeProfile("guesthouse", (1_800, 6_000), (2, 4)),
    "cabin": TypeProfile("cabin", (3_000, 12_000), (2, 6)),
    "villa": TypeProfile("villa", (12_000, 58_000), (6, 12)),
    "cottage": TypeProfile("cottage", (3_000, 14_000), (2, 6)),
    "tiny-home": TypeProfile("tiny home", (1_600, 4_000), (1, 2)),
    "treehouse": TypeProfile("treehouse", (4_000, 15_000), (2, 4)),
}

TITLE_ADJECTIVES = (
    "Sunlit",
    "Quiet",
    "Airy",
    "Restored",
    "Hillside",
    "Garden",
    "Heritage",
    "Modern",
    "Rustic",
    "Secluded",
    "Cheerful",
    "Breezy",
    "Hand-built",
    "Family",
    "Courtyard",
)
TITLE_FEATURES = (
    "with a private terrace",
    "with valley views",
    "with a reading nook",
    "near the market",
    "with a wraparound verandah",
    "for slow mornings",
    "with a sunset deck",
    "with a home-cooked breakfast",
    "among old trees",
    "with a plunge pool",
    "with a bonfire pit",
    "for long stays",
)

DESCRIPTION_OPENERS = (
    "A {adjective} {noun} {setting}.",
    "This {noun} sits {setting} and is looked after by the family who built it.",
    "Wake up {setting} in a {adjective} {noun} with room to spread out.",
)
DESCRIPTION_DETAILS = (
    "The rooms are bright, the beds are firm and the kitchen is stocked for real cooking.",
    "Mornings start with birdsong; evenings are best spent outside with a cup of chai.",
    "It suits families and small groups who want space, quiet and a proper kitchen.",
    "Fast wifi and a writing desk make it an easy place to work from for a week.",
    "Everything you need is within a short walk, and a caretaker lives nearby.",
)
DESCRIPTION_CLOSERS = (
    "We are happy to arrange local guides, cabs and home-cooked meals on request.",
    "Check-in is flexible, and we will share our favourite places to eat when you arrive.",
    "Please treat the place as your own home; our neighbours appreciate quiet after ten.",
)

# (name, bio). The first seven are the demo accounts offered in the login modal.
DEMO_HOSTS = (
    ("Ananya Rao", "I restore old homes and love sharing them with travellers."),
    ("Vikram Mehta", "Architect, weekend trekker and full-time host."),
    ("Leela Nair", "I host one cottage and treat every guest like family."),
    ("Kabir Sethi", "My place books out fast. Ask me about the monsoon."),
)
DEMO_GUESTS = (
    ("Meera Iyer", "Always planning the next long weekend."),
    ("Arjun Kapoor", "I travel for food and stay for the views."),
    ("Zoya Khan", "New here and looking for my first stay."),
)
OTHER_GUESTS = (
    "Rohan Das",
    "Priya Menon",
    "Aditya Joshi",
    "Sneha Kulkarni",
    "Imran Sheikh",
    "Tara Fernandes",
    "Dev Malhotra",
    "Nisha Pillai",
    "Karan Bhatia",
    "Ishita Ghosh",
    "Farhan Qureshi",
    "Lakshmi Reddy",
    "Sameer Chopra",
)

REVIEWS_BY_RATING: dict[int, tuple[str, ...]] = {
    5: (
        "Exactly as described and spotlessly clean. We would come back in a heartbeat.",
        "A wonderful stay. The host thought of everything, down to fresh flowers.",
        "The photos do not do it justice. Peaceful, comfortable and beautifully kept.",
        "Our family loved every minute. Check-in was easy and the beds were so comfortable.",
        "One of the best places we have stayed in. The view at sunrise is unforgettable.",
        "Warm hosts, great location and a kitchen that had everything we needed.",
        "Quiet, clean and full of character. We extended our trip by a day.",
        "Perfect for a long weekend. Fast wifi and a lovely spot to sit outside.",
    ),
    4: (
        "A lovely place and a helpful host. The road in is a little bumpy.",
        "Very comfortable and clean. Hot water took a few minutes to arrive.",
        "Great location and good value. The kitchen could use a few more utensils.",
        "We enjoyed our stay. It was slightly smaller than we expected but well kept.",
        "Nice and peaceful. Mobile signal is patchy, which we did not mind.",
    ),
    3: (
        "A decent stay. The place is fine, though it needs a little upkeep.",
        "Good location, but the rooms were warmer than we would have liked.",
        "Okay for a night or two. Check-in took longer than planned.",
    ),
    2: (
        "The location is good, but the place was not as clean as we hoped.",
        "Several things in the listing were not available during our stay.",
    ),
    1: ("Unfortunately the stay did not match the listing at all.",),
}
