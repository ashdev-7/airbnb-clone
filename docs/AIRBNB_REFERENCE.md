# Airbnb reference — verified facts

Everything the project claims about Airbnb is listed here with its source. `PROJECT_PLAN.md` cites these IDs (`REF-…`). A claim that is not in this file must come from a capture (`docs/CAPTURE_GUIDE.md`); nothing is taken from memory.

- **Read on:** 2026-10-09, signed out. Sections 2–10 were read on airbnb.com in English (US). Section 11 was read on the India site, airbnb.co.in, which is the one the project mirrors.
- **Locale rule:** the Help Center quotes establish what a feature is and how it behaves. Labels and spelling are taken from the India site (section 11) and from the captures, which are made on airbnb.co.in.
- **How:** an automated reader fetched each page and returned its text. Quotes below are as that reader returned them. They are reliable to the sentence; open the URL if exact punctuation matters.
- **Scope of this method:** it sees text and link addresses only. It cannot see layout, sizes, colours, fonts, hover states or motion. Those come from captures.

---

## 1. What could and could not be read

| Area | Readable from here? | Why |
|---|---|---|
| Home page text | Yes | |
| Help Center and Newsroom articles | Yes | |
| Host landing page (`/host/homes`) | Yes | |
| Search results (`/s/…/homes`) | **No** | Airbnb's `robots.txt` disallows `/s/*/*` for all automated agents |
| Listing pages (`/rooms/{id}`) | **No** | `robots.txt` disallows `/rooms/` for AI agents, and `/rooms/*/photos`, `/reviews`, `/amenities`, `/location`, `/house-rules`, `/description` for all agents |
| Checkout (`/book/`) | **No** | Disallowed for all agents; also needs a signed-in account |
| Trips, Wishlists, Hosting | **No** | Need a signed-in account (`/trips/v1/` is also disallowed) |
| Any rendered page (screenshots, CSS) | **No** | This workspace's network policy blocks airbnb.com for browsers and scripts |

**REF-X1** — `robots.txt`, rules for all agents include: `Disallow: /s/*/*`, `Disallow: /book/`, `Disallow: /trips/v1/`, `Disallow: /users/show`, `Disallow: /rooms/*/photos`, `Disallow: /rooms/*/reviews`, `Disallow: /rooms/*/amenities`, `Disallow: /rooms/*/location`, `Disallow: /rooms/*/house-rules`, `Disallow: /rooms/*/safety`, `Disallow: /rooms/*/cancellation-policy`, `Disallow: /rooms/*/description`. These paths also show which sub-views a listing page has: photos, reviews, amenities, location, house rules, safety, cancellation policy, description. A separate group for AI agents adds `Disallow: /rooms/`.
Source: https://www.airbnb.com/robots.txt

---

## 2. Home page

Source for REF-H1 to REF-H8: https://www.airbnb.com/

**REF-H1 — Header labels, in order:** "All", "Homes", "Experiences", "Services", "Become a host", "Help Center", "Languages & currency", "Log in or sign up". The account entry is "Log in or sign up". The "Become a host" menu contains "Refer a Host", "Find a co-host", "Gift cards".

**REF-H2 — Search bar fields:** "Where"; "When" with placeholder "Add dates"; "Who" with placeholder "Add guests". Help Center article 86 gives the desktop labels as "Where–Search destinations" and "Who–Add guests", and the button as "Search" (https://www.airbnb.com/help/article/86).

**REF-H3 — Sections on the home page:** "Destinations for you" (a horizontal carousel of about 20 city tiles, each with a short tagline); "Popular homes in {place}" (seen: "Popular homes in Hocking Hills State Park") with a "See all" link; a hotel promotion "Great hotels for your next trip"; "Available in {city} this weekend" (seen: Cleveland) with "See all"; "Inspiration for future getaways" with tabs "Popular", "Arts & culture", "Beach", "Mountains", "Outdoors", "Things to do", "Travel tips & inspiration", "Airbnb-friendly apartments" and a "Show more" toggle.

**REF-H4 — Home listing card text:** badge "Guest favorite"; title line in the form "{Property type} in {place}" (seen: "Cabin in South Bloomingville", "Cottage in Laurelville", "Cabin in Logan"); price line as a stay total (seen: "$1,111 for 2 nights", "$410 for 2 nights"); rating as a number with the accessible text "4.99 out of 5 average rating". No review count in the card text. Cards sit in horizontal carousels, not a grid.

**REF-H5 — Link addresses on the home page:** "See all" → `/s/{Location}/homes` with parameters `place_id`, `refinement_paths[]`, `flexible_trip_lengths[]`, `date_picker_type`, `search_type`. Home listing cards → `/s/homes` with `pinned_listings[]`, `pinned_reason`, `search_type`, `place_id`, `query`, `refinement_paths`, `flexible_trip_lengths`, `date_picker_type`, `photo_id`. Hotel cards → `/rooms/{id}` with `check_in`, `check_out`, `photo_id`, `source_impression_id`, `previous_page_section_name`.

**REF-H6 — Footer.**
- "Support": "Help Center", "Get help with a safety issue", "AirCover", "Travel insurance", "Anti-discrimination", "Disability support", "Cancellation options", "Report neighborhood concern"
- "Hosting": "Airbnb your home", "Airbnb your experience", "Airbnb your service", "AirCover for Hosts", "Earnings Protection", "Hosting resources", "Community forum", "Hosting responsibly", "Airbnb-friendly apartments", "Join a free hosting class", "Find a co‑host", "Refer a host"
- "Airbnb": "2026 Summer Release", "Newsroom", "Careers", "Investors", "Gift cards", "Airbnb.org emergency stays"
- Bottom bar: "English (US)", "$ USD", links to Facebook, Twitter and Instagram, "© 2026 Airbnb, Inc.", "Privacy", "Terms", "Your Privacy Choices"

**REF-H7 — Page title:** "Airbnb: Vacation Rentals, Cabins, Beach Houses, Unique Homes & Experiences".

**REF-H8 — Not on the home page:** no Filters button, no category icon row, no pagination.

---

## 3. Search and filters

**REF-S1 — Filter sections, in page order:** "Type of place" (any type, room, entire home); "Price range" (minimum and maximum); "Rooms and beds" (bedrooms, beds, bathrooms); "Amenities" (grouped: Popular, Bathroom, Bedroom and laundry, Entertainment, Family, Heating and cooling, Home safety, Internet and office, Kitchen and dining, Location features, Outdoor, Parking and facilities); "Booking options" (Instant Book, self check-in, allows pets); "Top-tier stays" (Guest favorites, Luxe); "Property type" (house, apartment, guesthouse, hotel); "Accessibility features"; "Host language".
Source: https://www.airbnb.com/help/article/3740

**REF-S2 — Using filters:** a search starts with a destination, check-in and checkout dates, and "the total number of guests and pets". "Click or tap the **Filters** button to refine your search." After selecting Filters, "you may see a row of recommended filters". "Price range: Filters by total price, excluding taxes." "It's not currently possible to search by keyword."
Source: https://www.airbnb.com/help/article/479

**REF-S3 — Search inputs and results:** "Just type in the name of a city or search by a region". Guests can be added as adults, children, infants and pets. Listings appear in search results and on a map: "You can zoom in or move around the map to find additional listings that don't appear at first." A "Flexible" tab searches by weekend, week or month.
Source: https://www.airbnb.com/help/article/252

**REF-S4 — 2026 Fall update (published 2026-09-30):** a new search bar that accepts typed or spoken queries (U.S. first), keyword search inside filters, AI-written descriptions in search results. The site is changing, so every capture must be dated.
Source: https://news.airbnb.com/airbnb-2026-fall-update

---

## 4. Guests

**REF-G1 — Guest categories:** adults, children, infants; pets are added in the same "Who–Add guests" field. "children are subject to a host's maximum guest capacity." "We recognize that service animals are not pets."
Sources: https://www.airbnb.com/help/article/433 · https://www.airbnb.com/help/article/86

**REF-G2 — Where the maximum is shown:** a listing's maximum guest count appears under "During your stay" in the "Things to know" section.
Source: https://www.airbnb.com/help/article/3512

**Not stated in any article read:** the age ranges for each category, whether infants count toward the maximum, and the upper limits of each stepper. These come from capture **A5** and **C3**.

---

## 5. Prices and fees

**REF-P1 — Total price display:** since 2025-04-21 guests worldwide see "the total price of their stay—including all fees before taxes—right from the start", including "when they browse listings in search results".
Source: https://news.airbnb.com/total-price-display-is-now-standard-globally

**REF-P2 — Where the breakdown is:** "the details of the price can still be found in the price breakdown during checkout."
Source: https://www.airbnb.com/help/article/3610

**REF-P3 — Service fees:** split-fee structure: guests pay "14.1% to 16.5% of the booking subtotal"; most hosts pay 3%. Single-fee structure: the whole fee (most hosts 15.5%) is deducted from the host's payout. Airbnb is moving home hosts to the single fee.
Source: https://www.airbnb.com/help/article/1857

---

## 6. Booking and availability

**REF-B1 — Booking steps (desktop):** "Click the listing you want to reserve." "Select dates, number of guests, then click **Reserve**." "If you see **Confirm and pay**, you can book instantly." "If you see **Request to book**", the host must accept.
Source: https://www.airbnb.com/help/article/85

**REF-B2 — Parts of a listing a guest reviews:** "Description", "Photos", "Reviews", "House rules", "Amenities", "Cancellation policy".
Source: https://www.airbnb.com/help/article/380

**REF-A1 — Booking window:** "You can book an Airbnb reservation up to 2 years in advance".
Source: https://www.airbnb.com/help/article/3593

---

## 7. Trips and host reservations

**REF-T1 — Guest:** "Click Trips and select your trip"; past reservations are under the "Past trips" label; cancelled ones under "Canceled reservations"; the confirmation code appears under "Reservation details".
Source: https://www.airbnb.com/help/article/2064

**REF-T2 — Host:** current reservations are on the **Today** tab; "click **Upcoming** to show reservations that haven't yet started"; completed ones are under Today > Menu > Earnings; a **Filter** on the Today tab selects listings.
Source: https://www.airbnb.com/help/article/3037

---

## 8. Wishlists

**REF-W1:** "Simply click or tap the heart on any listing you want to keep top of mind." "You can save the listing to an existing wishlist, or create a new wishlist." "You can always tap Change to save a listing to a different wishlist." Desktop: "Click Menu > Wishlists." A wishlist holds up to 100 listings.
Source: https://www.airbnb.com/help/article/1236

---

## 9. Reviews and badges

**REF-R1 — Reviews:** "Both parties will have 14 days after checkout to submit their review." A listing's rating is the average of its overall ratings and becomes visible "Once a home receives at least three reviews". It appears next to the listing title in search results and on the listing page.
Source: https://www.airbnb.com/help/article/13

**REF-R2 — Guest favorites:** "At least five reviews from guests", "Excellent reviews", high marks for check-in, cleanliness, accuracy, host communication, location and value. The listing "will feature a badge in search results". No numeric rating threshold is published.
Source: https://www.airbnb.com/help/article/3496

**REF-R3 — Superhost:** "Hosted at least 10 reservations, or 3 reservations that total at least 100 nights"; "Respond to 90% of new messages"; "Maintained a less than 1% cancellation rate"; "Maintained a 4.8 or higher overall rating". Assessed every three months over the past twelve.
Source: https://www.airbnb.com/help/article/829

---

## 10. Hosting and listings

**REF-L1 — Removing a listing:** "You can't permanently remove your listing if you have any upcoming reservations." "your listing can't be permanently removed until all reservations are completed." Unlisting hides it from search and "you'll still host your guests for any confirmed reservations."
Source: https://www.airbnb.com/help/article/476

**REF-L2 — Creating a listing has three steps:** "Tell us about your place" (kind of property, location, rooms, maximum guests); "Make your listing stand out" (photos, title, description, amenities); "Finish up and publish" (prices). The reader paraphrased the detail of each step; the step names are quoted.
Source: https://www.airbnb.com/resources/hosting-homes/a/how-to-get-started-on-airbnb-3

**REF-L3 — Publishing and status:** on **Today**, a banner "You're ready to publish" with a **Publish** button; a published listing has the status "Listed".
Source: https://www.airbnb.com/help/article/883

**REF-L4 — Home types:** "Entire place", "Room", "Shared room".
Source: https://www.airbnb.com/help/article/317

**REF-L5 — Host landing page:** heading "Your home could make money on Airbnb"; button "Get started" → `/become-a-host`.
Source: https://www.airbnb.com/host/homes

---

## 11. India site (airbnb.co.in)

Source for REF-I1 to REF-I4: https://www.airbnb.co.in/

**REF-I1 — Header labels, in order:** "All", "Homes", "Experiences", "Services", "Become a host", "Languages & currency", "Help Centre", "Log in or sign up". Search bar: "Where"; "When" with "Add dates"; "Who" with "Add guests". Same structure as the US site; British spelling ("Help Centre").

**REF-I2 — Listing card text:** badge "Guest favourite"; title line "{Property type} in {place}" (seen: "Home in Dayton", "Home in Kettering"); price as a stay total in rupees with no decimals (seen: "₹46,740 for 2 nights", "₹98,222 for 2 nights"); rating as a number with the accessible text "4.92 out of 5 average rating". Listing cards link to `/rooms/{id}` with `check_in`, `check_out`, `photo_id`, `source_impression_id`, `previous_page_section_name`. Section headings seen: "Popular homes in {place}", "Stay in {place}", "Homes in {place}", "Inspiration for future getaways". No amount of ₹1,00,000 or more appeared, so the digit grouping for six-digit prices is still to be read from a capture.

**REF-I3 — Footer.**
- "Support": "Help Centre", "Get help with a safety issue", "AirCover", "Anti-discrimination", "Disability support", "Cancellation options", "Report neighbourhood concern"
- "Hosting": "Airbnb your home", "Airbnb your experience", "Airbnb your service", "AirCover for Hosts", "Hosting resources", "Community forum", "Hosting responsibly", "Join a free hosting class", "Find a co‑host", "Refer a host"
- "Airbnb": "2026 Summer Release", "Newsroom", "Careers", "Investors", "Airbnb.org emergency stays"
- Bottom bar: "English (IN)", "₹ INR", "© 2026 Airbnb, Inc.", "Privacy", "Terms", "Company details"

**REF-I4 — Page title:** "Airbnb: Holiday Rentals, Cabins, Beach Houses, Unique Homes & Experiences".

The reader's request came from outside India, so the places shown were American; the labels, spelling and currency are the India site's.

---

## 12. Still unknown — answered only by captures

| Question | Capture |
|---|---|
| Header layout, which tab is active, behaviour on scroll | A1, A2 |
| Where / When / Who panels: content, calendar behaviour, stepper limits and age text | A3, A4, A5 |
| Account menu items and login modal layout | A6, A7 |
| Results page: columns, cards per page, card anatomy, pagination control, map pins | B1–B4 |
| Whether a listing card opens in a new tab | B1 measurement file (`links[].target`) |
| Filters modal layout and controls | B5–B7 |
| Listing page: every section, booking card, calendar, modals, sticky bar | C1–C11 |
| Checkout layout | D1, D2 |
| Trips, Wishlists, toast | E1–E4 |
| Hosting pages and the create-listing steps | F1–F12 |
| Every colour, font size, spacing, radius and shadow | The measurement file of each capture |
