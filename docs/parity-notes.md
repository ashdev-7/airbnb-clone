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
| Filter parameter names (price, property type, amenities, rooms) | Not in these files; no filter was applied | — | Pending: B5–B7 |
| Listing URL parameter names | Path `/rooms/{id}`. Dates are **`check_in`** and **`check_out`** (with underscore, unlike the search page); guests **`adults`** and **`guests`**. Also present and not built: `photo_id`, `source_impression_id`, `previous_page_section_name` | C2: `page.params`; B1: params of the listing links (`check_in`, `check_out`, `adults`) | Settled for dates and adults |
| Guest age text | Search panel: Adults "Ages 13 or above"; Children "Ages 2–12"; Infants "Under 2"; Pets "Bringing a service animal?" (a link). Booking card: Adults "Age 13+"; Children "Ages 2–12"; Infants "Under 2"; Pets "Bringing a service animal?" | A5, C3 | Settled |
| Limit of each stepper | **Adults + children: 16 in total.** With 16 adults, the "Increase" buttons of both Adults and Children are disabled. **Infants: 5.** With 5 infants its "Increase" button is disabled. **Pets: not shown.** The capture has 0 pets, so its limit cannot be read | A5: `control.disabled` of the stepper buttons | Guests and infants settled; pets stays provisional at 5 |
| Do infants count toward a listing's maximum? | **No.** The note reads "This place has a maximum of 10 guests, not including infants. If you're bringing…" (the tool keeps the first 80 characters). The search panel agrees: its summary is "16 guests, 5 infants" | C3, A5 | Settled. Whether pets count is in the cut-off part of the note: provisional (they do not) |
| Minimum adults | The Adults "Decrease" button is enabled at 2 and at 16; no capture shows it at 1 | A5, C3 | Provisional: at least 1 adult |
| Checkout path | — | D1 | Pending: Phase 8 |
| Lines and wording of the price breakdown | The booking card shows "₹14,998 for 2 nights" with a "Show price breakdown" link | C3 | Pending: C11, D1 (Phase 7) |
| Header on scroll, toast, colours, type scale, spacing | See "Phase 5" below | A2, E4, every file | Settled, except the toast's duration |

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
| E3 / E4 | Heart confirmation / save dialog | The files are the other way round: `E3` holds a "Create wishlist" dialog and `E4` holds the confirmation toast | Yes, swapped |
| F10 / F11 | (guide: F11 Today, F12 Listings) | The files are one number early: `F10` is Today and `F11` is Listings; there is no `F12` | Yes, shifted |
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
| Radius | 12 (menus, buttons, inputs, toast), 20 (cards), 32 (modal), full (search bar, discs) | A6, A7, B1, E4 |
| `shadow-menu` | `0 2px 16px rgba(0,0,0,.12)` | A6 |
| `shadow-raised` | `0 0 0 1px rgba(0,0,0,.02), 0 8px 24px rgba(0,0,0,.1)` | A1 search bar, A7 modal |
| `shadow-pill` | `0 1px 2px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.05)` | A2 compact search |
| `shadow-toast` | `0 6px 20px rgba(0,0,0,.2)` | E4 |
| `shadow-control` | `0 2px 4px rgba(0,0,0,.18)` | B1 photo arrows |
| Gutter | 48 px | A1 header and footer padding |

Type scale in use (size / line / weight): 12/16/500 (search labels), 14/18/400 and 500 (body, menus, footer, buttons), 15/19/400 and 500 (cards), 16/20/500 (modal buttons, stepper value), 20/24/600 at -0.18 px tracking (section headings), 26/30/600 at -0.52 px (modal heading).

### Measured layout

| Element | Values | Capture |
|---|---|---|
| Main header, open | Bar 96 px; mark 102 x 32 at the 48 px gutter; tabs centred, 35 px apart, 14/18/500, active one dark with a 3 px bar; search bar 850 x 66 starting 6 px under the bar; 200 px in all, then a 1 px hairline | A1 |
| Search bar | Three fields (278, 283, 278 px) split by 1 x 32 px rules; label 12/16/500 over hint 14/18 muted; 48 px round button 9 px from the right | A1 |
| Main header, scrolled | 96 px bar only; a 46 px pill "Anywhere / Anytime / Add guests" with 1 x 24 px rules and a 32 px button | A2 |
| Header right side | "Become a host" 40 px tall, 12 px padding, 14/18/500; two 40 px discs on `control`, 12 px apart | A1, E1 |
| Account menu | 265 px wide, 12 px padding above and below; rows 36 px with 24 px side padding; 16 px icons; 1 px dividers with 8 px margins; 17 px under its button | A6 |
| Modal | 480 px wide, 32 px corners, 64 px header with the close button on the right, 24 px side padding; 40 px mark above a 26 px heading | A7 |
| Checkout header | 80 px tall, mark 24 px from the left, hairline below | D1 |
| Hosting header | 96 px, three columns; centre links 40 px tall with 12 px padding, 8 px apart; the current one dark with a 1.5 px bar under its label; "Switch to travelling" on the right | F11 |
| Footer | Three equal columns from the gutter; heading 14/18/500 with 16 px below; links 16 px apart; 48 px padding above and below; a rule, then a bar with 24 px padding; 80 px below | A1 |
| Card | Photo 4:3 with 20 px corners on `line`; text 12 px below, inset 4 px, 15/19; heart 32 px button holding a 24 px heart, 10 px from the top and 12 px from the right; arrows 32 px discs 12 px in; dots 6 px, 5 px apart, 12 px from the bottom | B1, B3 |
| Card grid | Cards 328 px wide, 24 px between columns, 40 px between rows | B1 |
| Pagination | 32 px discs 16 px apart; current one filled `ink` with white text; "Previous" disabled at half opacity; 74 px under the last row | B2 |
| Stepper | 32 px round buttons on `control`, 12 px icons, value 16/20 between them | A5 |
| Toast | Fixed, 32 px from the left and 60 px from the bottom; white, 12 px corners, 1 px `line` border; 14/18 text | E4 |

### Questions of plan §6.14 settled here

| Question | Answer | Read from |
|---|---|---|
| What the header does on scroll | It stays at the top and shrinks from 200 px to its 96 px bar; the tabs give way to a compact search pill | A1, A2 |
| Toast position | Bottom left: 32 px from the left edge, 60 px from the bottom | E4 |
| Toast duration | Not readable from a still capture. **Provisional: 4 seconds** | none |
| Colours, type scale, spacing, radii, shadows | The tables above | every file |
| Card wording | The India site uses both "Flat in ..." and "Apartment in ..." (A2 screenshot), so our property-type names stay as they are | A2 |

### Built without a capture (ours, to be checked when one exists)

- The **signed-in account menu**: rows and dividers of A6 with the entries of plan §6.2.
- The label **"Switch to hosting"**: F11 shows "Switch to travelling" on the hosting side; the other side was captured only for a user who is not a host.
- **Hover and pressed states** of buttons, links and menu rows: a still capture does not show them.
- The **body of the login modal** (account rows) and the **Languages & currency panel**: ours by plan (D4, §6.2).
- The **avatar** when an account has no picture: the initial on a dark disc.
- The moment the header collapses (after 40 px of scroll) and the 200 ms change.
- Pagination shapes other than "page 1 of many", and the "per night" wording on cards (assignment O1; the original shows a stay total).
- Tab icons, the heart shape and the social marks: Lucide or our own drawings in place of the original's artwork.
