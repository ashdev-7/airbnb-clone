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

No screenshots are present yet; everything below comes from the measurement JSON.

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
| Header on scroll, toast, colours, type scale, spacing | — | A2, E3, every file | Pending: Phase 5 |

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

- Card text on the India site follows "{Type} in {place}": "Flat in Siolim", "Apartment in Verem", "Tiny home in Mandrem", "Home in Anjuna" (B1). It uses "Flat" and "Home" where our property types say "Apartment" and "House"; to settle in Phase 5.
- Photo controls on a card are labelled "Previous photo: {card title}" and "Next photo: {card title}" (B1).
- Dates in the booking card are shown as `10/16/2026` (C2), although the page language is en-IN.
- The listing page marks some days "This day is only available for checkout." (C2), which matches the rule in plan §10.2.
- The listing in C2/C3 shows "Pets allowed" among its details and "Bring your pets along for the stay." as a highlight.
- The map on the search page is a Google map (B1 test ids); ours is Leaflet with OpenStreetMap tiles (plan §7.2).
