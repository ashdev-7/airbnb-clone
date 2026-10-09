import { expect, test } from "@playwright/test";
import { cards, heading, profileNav, signIn } from "./helpers";

/*
 * React reports an error when its first render in the browser differs from the HTML the
 * server sent, and then leaves stale attributes behind (a saved heart drawn as unsaved).
 * Parts of a page attach at different moments, so data fetched in the browser can arrive
 * before a part is attached: these tests load each page in each state and require silence.
 */
test.describe("pages attach to the server HTML without errors", () => {
  for (const path of ["/", "/?page=3", "/s/homes", "/s/Goa/homes?adults=2&amenities=pool"]) {
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
    await page.goto("/s/homes");
    await expect(heading(page)).toHaveText(/homes$/);
    await expect(cards(page).getByRole("button", { name: /^Remove from wishlist/ })).toHaveCount(1);

    await cards(page).first().getByRole("button", { name: /^Remove from wishlist/ }).click();
    await expect(page.getByText("Removed from Wishlist")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
