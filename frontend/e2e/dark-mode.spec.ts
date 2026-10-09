import { expect, test } from "@playwright/test";
import { openMenu, profileNav } from "./helpers";

const background = () => getComputedStyle(document.body).backgroundColor;

/** Dark mode (bonus B5): off by default, switched from the account menu, remembered. */
test("dark mode is off by default, switches from the menu and survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(background)).toBe("rgb(255, 255, 255)");

  await openMenu(page);
  await page.getByRole("button", { name: /Dark mode\s*Off/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(background)).toBe("rgb(18, 18, 18)");

  // Text keeps its contrast: the ink is now light.
  const ink = await profileNav(page).evaluate((nav) => getComputedStyle(nav).color);
  expect(ink).toBe("rgb(241, 241, 241)");

  await page.goto("/s/Goa/homes");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await openMenu(page);
  await page.getByRole("button", { name: /Dark mode\s*On/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
