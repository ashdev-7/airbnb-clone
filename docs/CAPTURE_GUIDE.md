# Capture guide — the exact screenshots needed

Airbnb's search, listing, checkout and account pages cannot be read automatically (`docs/AIRBNB_REFERENCE.md` §1), so their look and behaviour come from captures you take in your own browser.

**A capture is two files with the same name:**

| File | Example | What it is |
|---|---|---|
| A screenshot | `A5.png` | A picture of the page in a given state |
| A measurement file | `A5-1536.json` | The exact numbers behind that picture: sizes, colours, fonts, spacing, and where each link opens. Made by one click on a bookmark; you never open or edit it |

The picture shows what it looks like. The measurement file gives the exact values, so nothing is estimated from the picture.

Both go in the project's `reference/` folder, which is git-ignored and never published.

---

## 1. Setup (once, about two minutes)

1. Open **Chrome** and go to **airbnb.co.in**. At the bottom of the page check that it says **English (IN)** and **₹ INR**.
2. **Maximise** the window and set zoom to 100% (Ctrl + 0). Keep it like that for every capture. You do not need to note the width; the measurement file records it.
3. Show the bookmarks bar: Ctrl + Shift + B.
4. Make the **Measure** bookmark:
   - Open the file `tools/measure.bookmarklet.txt` in Notepad. Select all (Ctrl + A), copy (Ctrl + C).
   - In Chrome, right-click the bookmarks bar → **Add page…**
   - Name: `Measure`
   - URL: paste (Ctrl + V)
   - Save.
5. Create a folder named `reference` inside the project folder.

## 2. For every capture

1. Go to the page named in the table.
2. Click **Measure** on the bookmarks bar. Type the ID from the table (for example `A5`) and press OK.
3. The tab title counts down five seconds. Use them to put the page in the state the table describes (open the panel, open the menu). If the page is already in that state, just wait.
4. A file such as `A5-1536.json` appears in Downloads. The first time, Chrome may ask whether the site can download multiple files: choose **Allow**.
5. With the page still in that state, take a screenshot (Windows: Win + Shift + S; Mac: Cmd + Shift + 4) and save it as `A5.png`.
6. Move both files into `reference/`.

**"Whole page" in the table** means: take one screenshot, scroll down one screen, take the next, until the bottom. Name them `A1-1.png`, `A1-2.png`, and so on. One measurement file is enough; it covers the whole page.

**"No measurement"** means the screenshot alone is enough.

### If the bookmark does nothing

Use the Console instead. Press F12, open the **Console** tab, open `tools/measure.js` in Notepad, copy all of it, paste it into the Console and press Enter. The first time, Chrome asks you to type `allow pasting` and press Enter before it lets you paste. After that it behaves exactly like the bookmark. For the next capture, click in the Console, press the ↑ key and Enter.

---

## 3. The list

Use one Indian city with plenty of homes (for example Goa) for every search capture, and one listing with at least five photos and several reviews for every listing capture.

### Set A — home and global (signed out) · needed for Phase 5

| ID | Page and state | Screenshot |
|---|---|---|
| A1 | airbnb.co.in, nothing open | Whole page |
| A2 | Same page scrolled down about one screen, so the header is in its scrolled state | One |
| A3 | **Where** clicked, its panel open | One |
| A4 | **When** clicked, calendar open, one check-in day clicked | One |
| A5 | **Who** clicked, guest panel open. Before measuring, press **+** on every row until it greys out, so each maximum shows | One |
| A6 | The menu button at the top right clicked, account menu open | One |
| A7 | **Log in or sign up** clicked, modal open | One |

### Set B — search results (signed out) · needed for Phase 6

Search the city with any dates a few weeks ahead and 2 adults.

| ID | Page and state | Screenshot |
|---|---|---|
| B1 | Results page, top | One |
| B2 | Results page scrolled to the very bottom, showing the page controls | One |
| B3 | Mouse resting on one listing card | One, no measurement |
| B4 | One price on the map clicked, its small card open | One |
| B5 | **Filters** clicked, modal at its top | One |
| B6 | Filters modal scrolled to the Amenities section | One |
| B7 | Filters modal scrolled to the bottom | One |

### Set C — listing page (signed out) · needed for Phase 7

| ID | Page and state | Screenshot |
|---|---|---|
| C1 | Listing page, no dates selected | Whole page |
| C2 | Dates selected; the booking card with its price in view | One |
| C3 | The guests box in the booking card clicked, steppers and the note under them visible | One |
| C4 | The calendar section, with some unavailable days in view | One |
| C5 | **Show all photos** clicked | One |
| C6 | In the photo view, one photo clicked so it opens alone | One |
| C7 | **Show all amenities** clicked | One |
| C8 | **Show all reviews** clicked | One |
| C9 | Scrolled past the photos until a bar with section links appears at the top | One |
| C10 | **Share** clicked | One |
| C11 | The price in the booking card clicked, if that opens a breakdown | One |

### Set D — checkout (signed in) · needed for Phase 8

Stop at the payment page. **Do not confirm a booking.**

| ID | Page and state | Screenshot |
|---|---|---|
| D1 | The page after clicking **Reserve** | Whole page |
| D2 | The payment-method selector opened | One |

### Set E — account pages (signed in) · needed for Phases 8 and 10

| ID | Page and state | Screenshot |
|---|---|---|
| E1 | **Trips** | Whole page |
| E2 | **Wishlists** | Whole page |
| E3 | A heart clicked on any listing: the confirmation that appears (be quick) | One, no measurement |
| E4 | The save-to-wishlist dialog, if one appears | One |

### Set F — hosting (signed in) · needed for Phase 9

Click **Become a host** and move through the steps without publishing. Delete the unfinished draft afterwards.

| ID | Page and state | Screenshot |
|---|---|---|
| F1 | First screen of the create-listing flow | One |
| F2 | Property type step | One |
| F3 | Location step | One |
| F4 | Guests / bedrooms / beds / bathrooms step | One |
| F5 | Amenities step | One |
| F6 | Photos step | One |
| F7 | Title step | One |
| F8 | Description step | One |
| F9 | Price step | One |
| F10 | Final review step | One |
| F11 | Hosting **Today** page | Whole page |
| F12 | Hosting **Listings** page | Whole page |

**Total: 43 captures.** Sets A, B and C (25 captures, no account needed) cover the pages the assignment grades most heavily; do those first.

### If you can only do five right now

**A5, B1, B2, C2, C3.** They settle rules the backend needs: guest limits, results per page, whether cards open in a new tab, and the lines of the price breakdown.

### Later, only if the responsive bonus is attempted

Repeat A1, B1, C1 and D1 with the Chrome window narrowed to about tablet width and about phone width (IDs `A1-tablet`, `A1-phone`, and so on).

---

## 4. What happens to the captures

- `reference/` stays on your machine. It is in `.gitignore`.
- The implementer reads each screenshot and measurement file, writes the values it uses into `docs/parity-notes.md` (our own notes, committed), and builds from those.
- Nothing from Airbnb's own files (code, stylesheets, fonts, icons, photos) is copied into the project.
