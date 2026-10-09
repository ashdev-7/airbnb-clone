# Parity notes

Values read from the captures in `reference/` and used in the build. Every entry names the capture it was read from. The captures themselves are not committed; these notes are our own.

All captures so far: `www.airbnb.co.in`, language `en-IN`, viewport 1536 × 695 at device pixel ratio 1.25, taken 2026-10-09.

## Capture check (before Phase 3)

| Capture | Intended state | Found in the measurement file | OK |
|---|---|---|---|
| A5 | Home page with the "Who" (guests) panel open | Path `/`; four steppers (Adults, Children, Infants, Pets) in the viewport; summary text "16 guests, 5 infants" | Yes. It was captured with the counts pushed to their limits, which is what makes the limits readable |
| B1 | Search results, top of page | Path `/s/Goa/homes`; heading "Over 1,000 homes"; 18 listing cards; map present | Yes |
| B2 | Search results, scrolled to the pagination | Same search, `scrollY` 3356; the pagination `nav` is in the viewport | Yes |
| C2 | Listing page, booking card with dates chosen | Path `/rooms/{id}`; card shows Check-in 10/16/2026, Checkout 10/18/2026, "2 guests", "Reserve" | Yes |
| C3 | Listing page, guest picker open in the booking card | Same listing; four steppers and the capacity note are in the viewport | Yes |

At that point no screenshots were present; this section comes from the measurement JSON alone. Screenshots arrived before Phase 5 (see below).

## Questions of plan §6.14

| Question | Answer | Read from | Status |
|---|---|---|---|
| Does a listing card open in a new tab? | **Yes.** Every listing link has `target="listing_{id}"`, a named target unique to the listing, with `rel="noopener noreferrer nofollow"`. A named target opens a new tab and reuses it if the same card is clicked again | B1, B2: `link.target`, `link.rel` of the `/rooms/{id}` links | Settled |
| How many results per page? | **18.** 18 elements with `data-testid="card-container"`; the pagination reads "Page 1 of 15" | B1, B2 | Settled |
| Search URL parameter names | Path `/s/{location}/homes`. Dates are **`checkin`** and **`checkout`** (no underscore); guests **`adults`**. Also present and not built: `date_picker_type`, `flexible_trip_dates[]`, `flexible_trip_lengths[]`, `refinement_paths[]`, `search_type` | B1: `page.path`, `page.params` | Settled for location, dates and adults. The search only had adults, so the names for children, infants and pets stay provisional (`children`, `infants`, `pets`) |
| Pagination parameter | Airbnb's page links carry `cursor` and `pagination_search`: its pagination is cursor-based. We use a numbered `page` parameter (plan D11) | B1: params of the `/s/Goa/homes` links | Settled: ours differs by decision |
| Filter parameter names (price, property type, amenities, rooms) | Rooms: `min_bedrooms`, `min_beds`, `min_bathrooms`. The others are not readable from B5 to B7 (see "Phase 6") | B5 | Rooms settled; the rest stay ours |
| Listing URL parameter names | Path `/rooms/{id}`. Dates are **`check_in`** and **`check_out`** (with underscore, unlike the search page); guests **`adults`** and **`guests`**. Also present and not built: `photo_id`, `source_impression_id`, `previous_page_section_name` | C2: `page.params`; B1: params of the listing links (`check_in`, `check_out`, `adults`) | Settled for dates and adults |
| Guest age text | Search panel: Adults "Ages 13 or above"; Children "Ages 2–12"; Infants "Under 2"; Pets "Bringing a service animal?" (a link). Booking card: Adults "Age 13+"; Children "Ages 2–12"; Infants "Under 2"; Pets "Bringing a service animal?" | A5, C3 | Settled |
| Limit of each stepper | **Adults + children: 16 in total.** With 16 adults, the "Increase" buttons of both Adults and Children are disabled. **Infants: 5.** With 5 infants its "Increase" button is disabled. **Pets: not shown.** The capture has 0 pets, so its limit cannot be read | A5: `control.disabled` of the stepper buttons | Guests and infants settled; pets stays provisional at 5 |
| Do infants count toward a listing's maximum? | **No.** The note reads "This place has a maximum of 10 guests, not including infants. If you're bringing…" (the tool keeps the first 80 characters). The search panel agrees: its summary is "16 guests, 5 infants" | C3, A5 | Settled. Whether pets count is in the cut-off part of the note: provisional (they do not) |
| Minimum adults | The Adults "Decrease" button is enabled at 2 and at 16; no capture shows it at 1 | A5, C3 | Provisional: at least 1 adult |
| Checkout path | — | D1 | Pending: Phase 8 |
| Lines and wording of the price breakdown | The booking card shows "₹14,998 for 2 nights" with a "Show price breakdown" link | C3 | Pending: C11, D1 (Phase 7) |
| Header on scroll, toast, colours, type scale, spacing | See "Phase 5" below | A2, E3, every file | Settled, except the toast's duration |

## Constants set from these answers

| Constant | Value | Where | Source |
|---|---|---|---|
| Results per page (default) | 18 | `backend/app/listings/schemas.py` `DEFAULT_PAGE_SIZE` | B1, B2 |
| Results per page (maximum) | 50 | same file, `MAX_PAGE_SIZE` | OURS (plan §10.6) |
| Maximum guests (adults + children) | 16 | `backend/app/bookings/guests.py` `MAX_GUESTS` | A5 |
| Maximum infants | 5 | `MAX_INFANTS` | A5 |
| Maximum pets | 5 | `MAX_PETS` | Provisional (OURS) |
| Infants count toward capacity | No | `counted_guests()` | C3 |

Both guest limits are served by `GET /api/meta`, so the frontend reads them instead of repeating them.

## Other observations (not yet used)

- Card text on the India site follows "{Type} in {place}": "Flat in Siolim", "Apartment in Verem", "Tiny home in Mandrem", "Home in Anjuna" (B1). Settled in Phase 5: the site uses "Flat" and "Apartment" side by side, so our names stay.
- Photo controls on a card are labelled "Previous photo: {card title}" and "Next photo: {card title}" (B1).
- Dates in the booking card are shown as `10/16/2026` (C2), although the page language is en-IN.
- The listing page marks some days "This day is only available for checkout." (C2), which matches the rule in plan §10.2.
- The listing in C2/C3 shows "Pets allowed" among its details and "Bring your pets along for the stay." as a highlight.
- The map on the search page is a Google map (B1 test ids); ours is Leaflet with OpenStreetMap tiles (plan §7.2).

## Phase 5: design system, shell, home

### Capture check (set A, and the others used here)

Screenshots arrived on 2026-10-09 as 26 files named by time. In time order they are A1, A2, A3, A4, A5, A6, A7, a second A7, B1 to B7 and C1 to C11; each was opened and matches its measurement file. Sets D, E and F have measurement files only.

| Capture | Intended state | Found | OK |
|---|---|---|---|
| A1 | Home, nothing open | Home with a one-time "one price for your trip" notice over it; the header, search bar and footer are measurable | Yes |
| A2 | Home scrolled, header in its scrolled state | `scrollY` 350; tabs gone, search shrunk to a pill | Yes |
| A6 | Account menu open | Signed-out menu | Yes |
| A7 | "Log in or sign up" modal | Yes; taken twice (`A7`, `A7-1`) | Yes |
| E1 | Trips | Signed-in header (menu closed) on an empty Trips page. **The signed-in menu was not captured open** | Partly |
| E3 / E4 | Heart confirmation / save dialog | The two files arrived the other way round and were **renamed on 2026-10-09**: `E3` now holds the confirmation toast and `E4` the "Create wishlist" dialog | Yes |
| F11 / F12 | Hosting Today / Listings | The two files arrived one number early (as `F10`, `F11`) and were **renamed on 2026-10-09** to `F11` (Today) and `F12` (Listings). **`F10`, the final review step of the create flow, is missing.** The `captureId` field inside a renamed file still holds its old number | Yes; F10 missing |
| D1 | Checkout | Path `/book/stays/{id}`; header measured | Yes |

### Typeface

The original uses its own family ("Airbnb Cereal VF", from `fonts`), which is not ours to use. Twenty-five free families were rendered in a browser and their text widths compared with fifteen strings measured in A1, A6, A7, B1 and the footer, at the captured size and weight. Mean width error: **Instrument Sans 0.84%**, Manrope 1.00%, Schibsted Grotesk 1.05%, DM Sans 1.53%, Inter 3.00%, Poppins 7.64%. Instrument Sans also has the closest letterforms next to crops of A2 and A7 (single-storey "g", round "o", flat-topped "t"). It is loaded through `next/font` (weights 400 to 700) and served from our own origin.

### Tokens (`frontend/app/globals.css`)

| Token | Value | Read from |
|---|---|---|
| `ink` | `#222222` | Text colour of every capture |
| `muted` | `#6c6c6c` | Secondary text (A1 "Add dates", B1 card lines) |
| `faint` | `#c1c1c1` | Disabled controls (A5 steppers, B2 "Previous") |
| `line` | `#dddddd` | Dividers and borders (A1 search bar, A6 menu, A7 buttons); photo placeholder (B1) |
| `line-soft` | `#ebebeb` | Hairline under the headers (A1 screenshot pixels, D1, F11); footer rule |
| `surface` | `#f7f7f7` | Footer background (A1) |
| `control` | `#f2f2f2` | Round header buttons, stepper buttons (A1, A5) |
| `brand` | `#ff385c` | The mark (A1 `color` of the home link) |
| `action` | `#da1249` | Search button (A1) |
| `scrim` | `rgba(0,0,0,0.4)` | Modal backdrop (A7) |
| Primary gradient | `#e61e4d` to `#e31c5f` to `#d70466`, left to right | "Continue" button (A7) |
| Header gradient | white to `#f8f8f8`, top to bottom | A6 screenshot pixels (the measurement file does not see it) |
| Radius | 12 (menus, buttons, inputs, toast), 20 (cards), 32 (modal), full (search bar, discs) | A6, A7, B1, E3 |
| `shadow-menu` | `0 2px 16px rgba(0,0,0,.12)` | A6 |
| `shadow-raised` | `0 0 0 1px rgba(0,0,0,.02), 0 8px 24px rgba(0,0,0,.1)` | A1 search bar, A7 modal |
| `shadow-pill` | `0 1px 2px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.05)` | A2 compact search |
| `shadow-toast` | `0 6px 20px rgba(0,0,0,.2)` | E3 |
| `shadow-control` | `0 2px 4px rgba(0,0,0,.18)` | B1 photo arrows |
| Gutter | 48 px | A1 header and footer padding |

Type scale in use (size / line / weight): 12/16/500 (search labels), 14/18/400 and 500 (body, menus, footer, buttons), 15/19/400 and 500 (cards), 16/20/500 (modal buttons, stepper value), 20/24/600 at -0.18 px tracking (section headings), 26/30/600 at -0.52 px (modal heading).

### Measured layout

| Element | Values | Capture |
|---|---|---|
| Main header, open | Bar 96 px; mark 102 x 32 at the 48 px gutter; tabs centred in boxes 71, 98.5, 124.7 and 103.7 px wide, 35 px apart, each a 36 px picture box and a 14/18/500 label starting 44, 52, 44 and 48 px into its box; active one dark with a 3 px bar 44 px down; search bar 850 x 66 starting 6 px under the bar; 200 px in all, then a 1 px hairline | A1 |
| Search bar | Three fields (278, 283, 278 px) split by 1 x 32 px rules; label 12/16/500 over hint 14/18 muted; 48 px round button 9 px from the right | A1 |
| Main header, scrolled | 96 px bar only; a 46 px pill "Anywhere / Anytime / Add guests" with 1 x 24 px rules and a 32 px button | A2 |
| Header right side | "Become a host" 40 px tall, 12 px padding, 14/18/500; two 40 px discs on `control`, 12 px apart | A1, E1 |
| Account menu | 265 px wide, 12 px padding above and below; rows 36 px with 24 px side padding; 16 px icons; 1 px dividers with 8 px margins; 17 px under its button | A6 |
| Modal | 480 px wide, 32 px corners, 64 px header with the close button on the right, 24 px side padding; 40 px mark above a 26 px heading | A7 |
| Checkout header | 80 px tall, mark 24 px from the left, hairline below | D1 |
| Hosting header | 96 px, three columns; centre links 40 px tall with 12 px padding, 8 px apart; the current one dark with a 1.5 px bar under its label; "Switch to travelling" on the right | F11, F12 |
| Footer | Three equal columns from the gutter; heading 14/18/500 with 16 px below; links 16 px apart; 48 px padding above and below; a rule, then a bar with 24 px padding; 80 px below | A1 |
| Home card | 181.7 px wide in the original; photo 20:19 with 20 px corners on `line`; text 8 px below, inset 4 px: first line 13/16/500, the rest 12/16 `muted`; price and rating share the last line, split by a `faint` dot, with an 8 px star; heart 8 px from the top and right | A1 (read from A6, the same page without the notice) |
| Home grid | Inside 88 px page margins, 12 px between cards. Ours by decision: 6 columns (214 px cards at this window) so 18 cards fill three rows; 32 px between rows | A1; product owner |
| Results card | Photo 4:3 with 20 px corners on `line`; text 12 px below, inset 4 px, 15/19; heart 32 px button holding a 24 px heart, 10 px from the top and 12 px from the right; arrows 32 px discs 12 px in; dots 6 px, 5 px apart, 12 px from the bottom | B1, B3 |
| Results grid | Cards 328 px wide, two columns beside the map, 24 px between columns, 40 px between rows | B1 |
| Pagination | 32 px discs 16 px apart; current one filled `ink` with white text; "Previous" disabled at half opacity; 74 px under the last row | B2 |
| Stepper | 32 px round buttons on `control`, 12 px icons, value 16/20 between them | A5 |
| Toast | Fixed, 32 px from the left and 60 px from the bottom; white, 12 px corners, 1 px `line` border; 14/18 text | E3 |

### Questions of plan §6.14 settled here

| Question | Answer | Read from |
|---|---|---|
| What the header does on scroll | It stays at the top and shrinks from 200 px to its 96 px bar; the tabs give way to a compact search pill | A1, A2 |
| Toast position | Bottom left: 32 px from the left edge, 60 px from the bottom | E3 |
| Toast duration | Not readable from a still capture. **Provisional: 4 seconds** | none |
| Colours, type scale, spacing, radii, shadows | The tables above | every file |
| Card wording | The India site uses both "Flat in ..." and "Apartment in ..." (A2 screenshot), so our property-type names stay as they are | A2 |

### Built without a capture (ours, to be checked when one exists)

- ~~The signed-in account menu~~ and ~~the label "Switch to hosting"~~: settled by captures G1 and G2 (see "Signed-in header" below).
- **Hover and pressed states** of buttons, links and menu rows: a still capture does not show them.
- The **body of the login modal** (account rows) and the **Languages & currency panel**: ours by plan (D4, §6.2).
- ~~The avatar when an account has no picture~~: settled by capture G1.
- The moment the header collapses (after 40 px of scroll) and the 200 ms change.
- Pagination shapes other than "page 1 of many", and the "₹X per night" wording on cards (assignment O1; product owner). The original shows a stay total.
- A home card links like every other card, in a tab named after the listing (B1); the original's home cards use `_blank` (A1).
- Tab icons, the heart shape and the social marks: Lucide or our own drawings in place of the original's artwork.

## Phase 6: search

### Capture check

| Capture | Intended state | Found | OK |
|---|---|---|---|
| A3 | "Where" panel open | 425 px panel under the left of the bar; "Suggested destinations" rows | Yes |
| A4 | Calendar open, one check-in day chosen | 850 px panel, two months, one dark day; "Dates / Flexible" switch and "Exact dates ± n days" chips also shown | Yes |
| A5 | Guest panel, every row at its maximum | Yes (read in Phase 3); the screenshot was taken at zero | Yes |
| B1 | Results, top of page | Header with pill and filter row, heading, two columns of cards, map | Yes |
| B3 | A card hovered | Photo arrow visible on the hovered card | Yes |
| B4 | A map marker clicked | Chosen marker dark; card with photo, close and heart | Yes |
| B5 | Filters modal, top | "Recommended for you", "Type of place", "Price range" with histogram, slider and two boxes, "Rooms and beds" | Yes |
| B6 | Filters modal, middle | "Amenities" chips with "Show more", "Booking options" | Yes |
| B7 | Filters modal, bottom | "Standout stays"; "Property type", "Accessibility features", "Host language" as closed headings | Yes |

### Questions of plan §6.14 settled here

| Question | Answer | Read from |
|---|---|---|
| Filter parameter names: rooms | `min_bedrooms`, `min_beds`, `min_bathrooms` | B5: test ids `stepper-filter-item-min_bedrooms-…` |
| Filter parameter names: price, property type, amenities | **Not readable**: no filter was applied in B5 to B7, and the address carries only `price_filter_input_type` and `price_filter_num_nights`. Ours stay `price_min`, `price_max`, `property_type`, `amenities` | B5 to B7: `page.params` |
| Guest parameter names beyond `adults` | Not shown (the captured search had adults only). Ours stay `children`, `infants`, `pets` | B1 |
| Is there a price histogram? | **Yes**: 47 bars of #e31c5f, 7.5 px wide, above a two-handle slider. Built | B5 |
| Stepper limit for pets | Still not shown. Provisional 5 | none |

### Measured layout

| Element | Values | Capture |
|---|---|---|
| Search bar, in use | The bar turns `line-soft` (#ebebeb); the part in use is lifted on white with `0 3px 12px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.08)`; the button widens to show "Search" | A3, A4, A5 |
| Panels | Start 12 px under the bar; white, 32 px corners, `shadow-raised` | A3 to A5 |
| Where panel | 425 px wide, left; 24 px padding above and below; a 12/16 heading; rows of a 56 px tile (12 px corners, #f4f4f4), a 14/18/500 name and a 14/18 `muted` line 2 px under it; rows 72 px apart | A3 |
| Calendar | 850 px wide; two months 54 px apart; cells 51.5 px, weeks 2 px apart; month name 16/20/500 in a 64 px band; weekday initials 12/500 `muted`; day numbers 14/500; chosen day a dark disc with white text; days that cannot be chosen `faint` | A4 |
| Who panel | 425 px wide, right; 40 px side padding; rows 90 px apart split by rules; name 16/20/500, age line 14/18 `muted` 4 px under it | A5 |
| Results header | The 96 px bar with the compact pill, then a 54 px filter row; 151 px with its hairline | B1 |
| Filter row | Buttons 34 px tall, 24 px corners, 12 px side padding, 12/16 text, hairline `line` border, 8 px apart; a 1 px rule after "Filters" | B1 |
| Results | Heading 20/24/600 at -0.18 px, 32 px under the header; cards 32 px under it in a 680 px column; map 48 px to the right, 20 px corners, stays in view 40 px under the header | B1 |
| Map marker | White pill, 14/18/700 price; the chosen one dark with white text | B4 |
| Map card | 327 px wide, photo about 209 px tall, round 32 px close button at the top right | B4 |
| Filters modal | 568 px wide; 64 px header with the title centred (16/20/600); sections headed 18/24/500 and split by rules; footer with a 0 -2px 16px shadow, 24 px padding, "Clear all" on the left and a dark button on the right | B5 to B7 |
| Price boxes | 48 px tall pills with an inset 1 px `line` border; 12/16/500 `muted` labels "Minimum" and "Maximum" above | B5 |
| Rooms and beds | Rows 56 px apart, 16/20 labels, steppers showing "Any" at zero | B5 |
| Amenity chips | 48 px tall, 28 px corners, 16 px side padding, 14/18 text, an icon before the name; "Show more" 16/20/500 underlined | B6 |
| Property type | A closed heading with a chevron on the right | B7 |

### Built without a capture, or different by decision

- **Sections of the modal not built** (plan §6.5): Recommended for you, Type of place, Booking options, Standout stays, Accessibility features, Host language. There is no data behind them.
- **The price filter is the nightly price** (assignment O5); the original filters the trip total ("Trip price, includes all fees"). Our note reads "Nightly price, before fees".
- **The calendar has dates only**: no "Flexible" switch and no "± n days" chips (plan §6.4).
- **The tint between the two ends of a date range**: A4 shows a single chosen day. Ours is `surface`.
- **A chosen chip** (dark border, `surface` tint) and the **count beside "Filters"**: no capture shows a filter switched on.
- **Quick filters in the row**: "Under ₹5,000", three property types, four amenities and "Pets allowed", in place of the recommended filters of the original (assignment O3). Wifi is not offered: every seeded home has it.
- **Where suggestions** come from our own listings, with the number of homes as the second line; the original shows curated places and recent searches.
- **The pets row** shows the captured text "Bringing a service animal?" as plain text; the original links it to a help page we do not have.
- **The results heading** reads "23 homes in Goa"; the original reads "Over 1,000 homes".
- **The map** is Leaflet with OpenStreetMap tiles, not a Google map, and does not search as it moves (a placeholder, plan §3). The card opens above its marker.
- **Cards** read "₹X per night", and "· ₹Y total" after it when the search has dates (assignment O1; product owner).
- The filter row of the home page sits under the header, above the grid; using it opens the search page.

## Signed-in header (captures G1 and G2, added 2026-10-09)

| Capture | Intended state | Found | OK |
|---|---|---|---|
| G1 | Profile page, signed in | `/users/profile`: "Profile" column with "About me" and "Connections"; a card with the initial, name and "Guest"; "Complete your profile" with "Get started"; "Show reviews I've written" | Yes |
| G2 | The same page with the account menu open | Menu with four icon rows, four general rows, the hosting block, two host rows and "Log out" | Yes |

| Element | Values | Capture |
|---|---|---|
| Avatar without a picture | 40 px disc `#fee5e7` with the initial in `#a21039` (read from the screenshot; the measurement file sees only an image). Tokens `avatar` and `avatar-ink` | G1 |
| Avatar link | Goes to `/users/profile` | G1, G2: `link.path` |
| Hosting link for a host | "Switch to hosting", 14/18/500, to `/hosting` | G1 |
| Signed-in menu | 265 px wide, same rows as A6 (36 px, 24 px side padding, 16 px icons). First group 14/18/**500**: Wishlists, Trips, Messages, Profile. Second group 14/18/400: Notifications, Account settings, Languages & currency, Help Centre. Then the "Become a host" block, "Refer a host", "Find a co-host", and "Log out" | G2 |

What we build from G2: the first group as captured; "Languages & currency" and "Help Centre" from the second; our "Verify your identity" placeholder (plan §6.11); the hosting row; "Switch account" (ours, because login is mocked) and "Log out".

Property-type names on cards across all captures: "Flat" (170 cards), "Apartment" (82), "Home" (57), "Villa" (24), "Tiny home" (22), "Loft" (3); "Room" is out of scope. Ours: house is "Home", apartment is "Flat"; "Villa" and "Tiny home" as captured; Guesthouse, Cabin, Cottage and Treehouse do not appear in any capture and keep their names. B7 shows the "Property type" section of the filters closed, so the option labels inside it are not known; the card names are used there too.

## Parity backlog

Every known visual difference from a capture that is not a decision of the plan. To be closed, or accepted by the product owner, in Phase 10.

| # | Where | Capture | Difference | Kind |
|---|---|---|---|---|
| 1 | Header tabs | A1 | Line icons in place of the original's coloured pictures; the row has the captured box sizes | Substitution (no artwork of our own) |
| 2 | Compact search pill | A2, B1 | A line icon of a house in place of the small picture at its left | Substitution |
| 3 | Mark and wordmark | A1 | Lucide house and "AirStay" in place of the original mark; same box (102 x 32) and colour | By plan §5.2 |
| 4 | Typeface | all | Instrument Sans; widths within 1% on average, letterforms differ slightly | By plan §5.2 |
| 5 | Hover, focus and pressed states | all | Ours throughout: stills do not show them | Needs a capture or acceptance |
| 6 | Header collapse | A1 to A2 | The scroll distance (40 px) and the 200 ms change are ours | Needs a recording or acceptance |
| 7 | Where panel | A3 | No "Recent searches"; tiles hold a line icon, not the original's pictures; second line is a count of homes | Partly by plan §6.4 |
| 8 | Calendar | A4 | The tint between the two ends of a range is unverified; the arrows are 32 px discs where the original's are bare 12 px arrows | Fixable |
| 9 | Who panel | A5 | "Bringing a service animal?" is plain text, not an underlined link | Fixable once there is somewhere to link |
| 10 | Signed-out menu | A6 | No picture beside "Become a host"; no "Refer a host" or "Find a co-host" rows | Not in scope |
| 11 | Signed-in menu | G2 | "Trips" has a luggage icon where the original uses its mark; no "Notifications", "Account settings", "Refer a host", "Find a co-host" | Substitution; not in scope |
| 12 | Results card | B1 | No rooms line ("1 bedroom · 1 bed · 1 bathroom"), no "Free cancellation" tag, no struck-through earlier price, price not underlined; "Guest favourite" and "Superhost" badges are bonus B3 | Rooms line fixable; the rest have no data |
| 13 | Results heading row | B1 | No "Prices include all fees" tag at the right of the heading | No data (our price is nightly) |
| 14 | Photo dots | B1, B3 | Five dots of one size; the original shows more dots, shrinking towards the end | Fixable |
| 15 | Map | B1, B4 | OpenStreetMap drawing and Leaflet's square zoom control in place of the Google map with round controls and an expand button; the pill padding and shadow of markers are estimated | Zoom control fixable; tiles by plan §7.2 |
| 16 | Map card | B4 | One photo without arrows or dots; no rooms line; opens above the marker, not beside it | Fixable |
| 17 | Filters modal | B5 | 30 histogram bars where the original has 47; the handles and the look of a chosen chip are unverified | Fixable; needs a capture of a chosen chip |
| 18 | Toast | E3 | Text only: the original shows a thumbnail of the listing; the duration is provisional | Fixable; duration needs a recording |
| 19 | Footer | A1 | Our own drawings of the three social marks | By plan §5.2 |
| 20 | Home card | A1 | No "Guest favourite" badge (bonus B3); a second line with the listing title, which the original does not have | Title by the assignment (R-HS-1) |
| 21 | Login modal | A7 | The accounts sit in a list that can scroll at this window height; the original's body is a single field | By plan D4 |

