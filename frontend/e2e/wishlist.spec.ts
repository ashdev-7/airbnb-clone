import { expect, test, type Page } from "@playwright/test";
import { cards, chooseAccount, openMenu, signIn } from "./helpers";

const saved = (page: Page) => cards(page).getByRole("button", { name: /^Remove from wishlist/ });

test.describe("the wishlist heart (plan §6.3)", () => {
  test("signed out, the heart asks for an account and saves afterwards; saves persist per user", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(cards(page).first()).toBeVisible();

    // Signed out: the picker opens, and the listing is saved once an account is chosen.
    const third = cards(page).nth(2);
    const name = await third.getByRole("heading").innerText();
    await third.getByRole("button", { name: /^Add to wishlist/ }).click();
    await chooseAccount(page, "Arjun Kapoor");
    await expect(saved(page)).toHaveCount(1);
    await expect(cards(page).nth(2).getByRole("button", { name: `Remove from wishlist: ${name}` })).toBeVisible();

    // Signed in: the heart saves at once, with a toast.
    await cards(page).first().getByRole("button", { name: /^Add to wishlist/ }).click();
    await expect(page.getByText("Saved to Wishlist")).toBeVisible();
    await expect(saved(page)).toHaveCount(2);

    // The saves are on the server: they survive a reload.
    await page.reload();
    await expect(saved(page)).toHaveCount(2);
    const ids = await page.request.get("/api/wishlist/ids");
    expect((await ids.json()).ids).toHaveLength(2);

    await cards(page).first().getByRole("button", { name: /^Remove from wishlist/ }).click();
    await expect(page.getByText("Removed from Wishlist")).toBeVisible();
    await expect(saved(page)).toHaveCount(1);

    // Another account has its own list.
    await openMenu(page);
    await page.getByRole("dialog").getByRole("button", { name: "Switch account" }).click();
    await chooseAccount(page, "Vikram Mehta");
    await expect(cards(page).first()).toBeVisible();
    await expect(saved(page)).toHaveCount(0);
  });

  test("the heart does not open the listing", async ({ page, context }) => {
    await page.goto("/");
    await signIn(page, "Zoya Khan");
    await cards(page).nth(4).getByRole("button", { name: /^Add to wishlist/ }).click();
    await expect(page.getByText("Saved to Wishlist")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(context.pages()).toHaveLength(1);
    await cards(page).nth(4).getByRole("button", { name: /^Remove from wishlist/ }).click();
    await expect(page.getByText("Removed from Wishlist")).toBeVisible();
  });

  test("the Wishlists page lists the saved homes; the heart there removes one", async ({ page }) => {
    await page.goto("/wishlists");
    await expect(page.getByRole("heading", { name: "Log in to view your wishlists" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
    await chooseAccount(page, "Zoya Khan");
    await expect(page.getByRole("heading", { name: "No saved homes yet" })).toBeVisible();

    // Save two homes from the home page, then find them on the page.
    await page.getByRole("link", { name: "Start exploring" }).click();
    const names: string[] = [];
    for (const index of [0, 3]) {
      names.push(await cards(page).nth(index).getByRole("heading").innerText());
      await cards(page).nth(index).getByRole("button", { name: /^Add to wishlist/ }).click();
      await expect(cards(page).nth(index).getByRole("button", { name: /^Remove from wishlist/ })).toBeVisible();
    }
    await openMenu(page);
    await page.getByRole("dialog").getByRole("link", { name: "Wishlists" }).click();
    await expect(page).toHaveURL(/\/wishlists$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wishlists");
    const tiles = page.getByRole("main").getByRole("listitem");
    await expect(tiles).toHaveCount(2);
    for (const name of names) await expect(tiles.filter({ hasText: name }).first()).toBeVisible();
    await expect(tiles.first().getByRole("link")).toHaveAttribute("href", /^\/rooms\/\d+$/);

    // Removing: the tile goes at once, and stays gone after a reload.
    await tiles.first().getByRole("button", { name: /^Remove from wishlist/ }).click();
    await expect(page.getByText("Removed from Wishlist")).toBeVisible();
    await expect(tiles).toHaveCount(1);
    await page.reload();
    await expect(tiles).toHaveCount(1);
    await tiles.first().getByRole("button", { name: /^Remove from wishlist/ }).click();
    await expect(page.getByRole("heading", { name: "No saved homes yet" })).toBeVisible();
  });
});
