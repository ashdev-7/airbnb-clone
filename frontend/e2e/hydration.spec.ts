import { expect, test } from "@playwright/test";
import { cards, daysFromNow, heading, profileNav, signIn } from "./helpers";

/*
 * React reports an error when its first render in the browser differs from the HTML the
 * server sent, and then leaves stale attributes behind (a saved heart drawn as unsaved).
 * Parts of a page attach at different moments, so data fetched in the browser can arrive
 * before a part is attached: these tests load each page in each state and require silence.
 */
test.describe("pages attach to the server HTML without errors", () => {
  for (const path of ["/", "/s/homes", "/s/homes?page=3", "/s/Goa/homes?adults=2&amenities=pool"]) {
    test(`signed out: ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(path);
      await expect(cards(page).first()).toBeVisible();
      await expect(profileNav(page).getByRole("button", { name: "Log in or sign up" })).toBeEnabled();
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }

  test("signed out: a listing with dates", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/rooms/40?check_in=${daysFromNow(120)}&check_out=${daysFromNow(123)}&adults=2`);
    await expect(page.getByLabel("Price details")).toContainText("Total");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("signed in, with a saved home: the header and the hearts are right after every load", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await signIn(page, "Leela Nair");
    const first = cards(page).first();
    await first.getByRole("button", { name: /^Add to wishlist/ }).click();
    await expect(page.getByText("Saved to Wishlist")).toBeVisible();

    // Several loads: whether the answer about the user arrives before or after a part of
    // the page is attached varies from load to load.
    for (let load = 0; load < 5; load++) {
      await page.reload();
      await expect(profileNav(page).getByRole("link", { name: "Profile: Leela Nair" })).toBeVisible();
      await expect(cards(page).first().getByRole("button", { name: /^Remove from wishlist/ })).toBeVisible();
      await expect(cards(page).getByRole("button", { name: /^Remove from wishlist/ })).toHaveCount(1);
    }
    // The first card of the home page is the first home of Goa.
    await page.goto("/s/Goa/homes");
    await expect(heading(page)).toHaveText(/homes in Goa$/);
    await expect(cards(page).getByRole("button", { name: /^Remove from wishlist/ })).toHaveCount(1);

    // The listing page too: its price is there after every load, and "Saved" on the title.
    const saved = (await (await page.request.get("/api/wishlist/ids")).json()).ids[0];
    for (let load = 0; load < 3; load++) {
      await page.goto(`/rooms/${saved}?check_in=${daysFromNow(130)}&check_out=${daysFromNow(132)}&adults=1`);
      await expect(page.getByLabel("Price details")).toContainText("Total");
      await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    }

    await page.goto("/");
    await cards(page).first().getByRole("button", { name: /^Remove from wishlist/ }).click();
    await expect(page.getByText("Removed from Wishlist")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
