import { expect, test, type Page } from "@playwright/test";
import { cards, daysFromNow, heading, openMenu, profileNav, signIn } from "./helpers";

const NOT_FOUND = "We can’t find that page";

/** Every link (an `a` with an address on this site) inside the given parts of the page. */
async function linksIn(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((parts) => [
    ...new Set(
      parts.flatMap((part) =>
        [...part.querySelectorAll("a[href]")]
          .map((link) => link.getAttribute("href") ?? "")
          .filter((href) => href.startsWith("/")),
      ),
    ),
  ]);
}

async function visitAll(page: Page, hrefs: string[]): Promise<void> {
  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first(), href).toBeVisible();
    await expect(page.getByRole("heading", { name: NOT_FOUND }), href).toHaveCount(0);
  }
}

test.describe("no dead ends", () => {
  test("every link in the header, the account menu and the footer leads to a page", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page).first()).toBeVisible();

    // Signed out: header (with its tabs), menu, footer.
    await openMenu(page);
    const signedOut = await linksIn(page, "header, footer, [data-radix-popper-content-wrapper]");
    await page.keyboard.press("Escape");
    expect(signedOut.length).toBeGreaterThan(25);

    // Signed in as a guest and as a host: the header and menu change.
    await signIn(page, "Meera Iyer");
    await openMenu(page);
    const asGuest = await linksIn(page, "header, [data-radix-popper-content-wrapper]");
    await page.keyboard.press("Escape");
    for (const expected of ["/wishlists", "/trips", "/messages", "/users/profile", "/become-a-host"]) {
      expect(asGuest).toContain(expected);
    }

    await page.goto("/hosting");
    const hosting = await linksIn(page, "header");
    for (const expected of ["/hosting", "/hosting/calendar", "/hosting/listings", "/hosting/messages"]) {
      expect(hosting).toContain(expected);
    }

    await visitAll(page, [...new Set([...signedOut, ...asGuest, ...hosting])]);

    // And the buttons that navigate: hosting for a host, checkout from a listing.
    await page.goto("/");
    await openMenu(page);
    await page.getByRole("dialog").getByRole("button", { name: "Switch account" }).click();
    await page.getByRole("dialog", { name: "Log in or sign up" }).getByRole("button", { name: /Ananya Rao/ }).click();
    await profileNav(page).getByRole("link", { name: "Switch to hosting" }).click();
    await expect(page).toHaveURL(/\/hosting$/);
    await expect(page.getByRole("heading", { name: NOT_FOUND })).toHaveCount(0);

    await page.goto(`/rooms/40?check_in=${daysFromNow(140)}&check_out=${daysFromNow(142)}&adults=1`);
    const reserve = page.getByRole("complementary", { name: "Reserve this place" }).getByRole("button", { name: "Reserve" });
    await expect(page.getByLabel("Price details")).toBeVisible();
    await reserve.click();
    await expect(page).toHaveURL(/\/book\/stays\/40\?/);
    await expect(heading(page)).toHaveText("Confirm and pay");
  });

  test("the logo always loads the home page afresh and clears the search", async ({ page }) => {
    // From a search: home, with an empty search bar.
    await page.goto(`/s/Goa/homes?checkin=${daysFromNow(20)}&checkout=${daysFromNow(22)}&adults=2`);
    await page.getByRole("link", { name: "AirStay homepage" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByPlaceholder("Search destinations")).toHaveValue("");
    await expect(page.getByRole("banner")).toContainText("Add dates");

    // On the home page itself: a real reload, so what was typed is gone.
    await page.getByPlaceholder("Search destinations").fill("Jaipur");
    await page.evaluate(() => ((window as unknown as { marker: string }).marker = "before"));
    await page.getByRole("link", { name: "AirStay homepage" }).click();
    await expect(page.getByPlaceholder("Search destinations")).toHaveValue("");
    expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBeUndefined();

    // From every kind of page.
    for (const path of ["/rooms/40", "/wishlists", "/hosting", "/book/stays/40", "/coming-soon?about=Careers"]) {
      await page.goto(path);
      await page.getByRole("link", { name: "AirStay homepage" }).click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("region", { name: "Popular homes in Goa" })).toBeVisible();
    }
  });

  test("every page names itself in the tab, and the site has its icon", async ({ page }) => {
    const listing = await (await page.request.get("/api/listings/40")).json();
    const titles: [string, RegExp][] = [
      ["/", /^AirStay: Holiday Rentals/],
      ["/s/homes", /^Homes · AirStay$/],
      ["/s/Goa/homes?adults=2", /^Homes in Goa · AirStay$/],
      ["/rooms/40", new RegExp(`^${listing.title} - .+ in ${listing.city} · AirStay$`)],
      ["/wishlists", /^Wishlists · AirStay$/],
      ["/trips", /^Trips · AirStay$/],
      ["/messages", /^Messages · AirStay$/],
      ["/experiences", /^Experiences · AirStay$/],
      ["/hosting", /^Hosting · AirStay$/],
      ["/book/stays/40", /^Confirm and pay · AirStay$/],
      ["/rooms/999999", /^Page not found · AirStay$/],
      ["/no-such-page", /^Page not found · AirStay$/],
    ];
    for (const [path, title] of titles) {
      await page.goto(path);
      await expect(page, path).toHaveTitle(title);
      expect(await page.title(), path).not.toMatch(/airbnb/i);
    }
    const icon = await page.locator('link[rel="icon"]').first().getAttribute("href");
    expect(icon).toMatch(/icon\.svg/);
    const svg = await (await page.request.get(icon!)).text();
    expect(svg).toContain("#ff385c");
  });

  test("\"Bringing a service animal?\" explains itself and leaves the guest panel open", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByRole("banner").getByRole("search");
    await bar.getByRole("button", { name: /Who/ }).click();
    await page.getByRole("button", { name: "Bringing a service animal?" }).click();
    const modal = page.getByRole("dialog", { name: "Service animals" });
    await expect(modal).toContainText("not a pet");
    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).toBeHidden();
    await expect(page.getByRole("button", { name: "Increase Adults" })).toBeVisible();

    await page.goto("/rooms/40");
    const card = page.getByRole("complementary", { name: "Reserve this place" });
    await card.getByRole("button", { name: /Guests/ }).click();
    await card.getByRole("button", { name: "Bringing a service animal?" }).click();
    await expect(modal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(card.getByRole("button", { name: "Increase Adults" })).toBeVisible();
  });
});
