import { expect, test } from "@playwright/test";
import { accountPicker, cards, chooseAccount, openMenu, profileNav, signIn } from "./helpers";

test.describe("identity (plan §6.1)", () => {
  test("signed out: the header offers hosting and login; the picker lists the seeded accounts", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(cards(page).first()).toBeVisible();
    await expect(profileNav(page).getByRole("button", { name: "Become a host" })).toBeVisible();

    await openMenu(page);
    for (const row of ["Languages & currency", "Help Centre", "Log in or sign up"]) {
      await expect(page.getByRole("dialog").getByText(row, { exact: true })).toBeVisible();
    }
    await page.keyboard.press("Escape");

    await profileNav(page).getByRole("button", { name: "Log in or sign up" }).click();
    const rows = accountPicker(page).getByRole("listitem");
    await expect(rows).toHaveCount(7);
    for (const text of await rows.allInnerTexts()) expect(text).toMatch(/(Guest|Host)$/);
    // Login is mocked: no field anywhere takes a password, phone number or email.
    await expect(accountPicker(page).locator("input")).toHaveCount(0);
  });

  test("sign in as a guest, switch to a host, log out", async ({ page }) => {
    await page.goto("/");
    await signIn(page, "Meera Iyer");
    await expect(page.getByText("Signed in as Meera Iyer")).toBeVisible();
    await expect(profileNav(page).getByRole("link", { name: "Become a host" })).toBeVisible();
    await expect(profileNav(page).getByRole("link", { name: "Profile: Meera Iyer" })).toHaveAttribute(
      "href",
      "/users/profile",
    );

    await openMenu(page);
    const menu = page.getByRole("dialog");
    for (const row of ["Wishlists", "Trips", "Messages", "Profile"]) {
      await expect(menu.getByRole("link", { name: row, exact: true })).toBeVisible();
    }
    await expect(menu.getByRole("button", { name: "Log out" })).toBeVisible();

    await menu.getByRole("button", { name: "Switch account" }).click();
    // The menu closes as the picker opens.
    await expect(page.getByRole("button", { name: "Switch account" })).toHaveCount(0);
    await chooseAccount(page, "Ananya Rao");
    await expect(page.getByText("Signed in as Ananya Rao")).toBeVisible();
    // A host is a user who owns a listing: the header changes with the account.
    await expect(profileNav(page).getByRole("link", { name: "Switch to hosting" })).toBeVisible();
    await expect(profileNav(page).getByText("Become a host")).toHaveCount(0);

    await openMenu(page);
    await page.getByRole("dialog").getByRole("button", { name: "Log out" }).click();
    await expect(page.getByText("Logged out")).toBeVisible();
    await expect(profileNav(page).getByRole("button", { name: "Log in or sign up" })).toBeVisible();
    const me = await page.request.get("/api/auth/me");
    expect(await me.json()).toEqual({ user: null });
  });

  test("the session survives a reload", async ({ page }) => {
    await page.goto("/");
    await signIn(page, "Zoya Khan");
    await page.reload();
    await expect(profileNav(page).getByRole("link", { name: "Profile: Zoya Khan" })).toBeVisible();
  });

  test("Become a host, signed out, asks for an account and then goes on to hosting", async ({ page }) => {
    await page.goto("/");
    await profileNav(page).getByRole("button", { name: "Become a host" }).click();
    await accountPicker(page).getByRole("button", { name: /Zoya Khan/ }).click();
    await expect(page).toHaveURL(/\/become-a-host$/);
  });
});
