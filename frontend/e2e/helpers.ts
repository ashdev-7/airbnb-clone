import { expect, type Locator, type Page } from "@playwright/test";

/*
 * Selectors go through roles and labels (CLAUDE.md): with Cache Components the page a
 * visitor came from stays mounted but hidden, and only role-based queries skip it.
 */

export const profileNav = (page: Page): Locator => page.getByRole("navigation", { name: "Profile" });

/** The listing cards on the page that is showing. */
export const cards = (page: Page): Locator => page.getByRole("main").getByRole("article");

/** The heading of the page that is showing ("40 homes in Goa"). */
export const heading = (page: Page): Locator => page.getByRole("main").getByRole("heading", { level: 1 });

/** The number at the start of a results heading. */
export async function homesFound(page: Page): Promise<number> {
  await expect(heading(page)).toHaveText(/^\d[\d,]* homes?/);
  const text = await heading(page).innerText();
  return Number(text.split(" ")[0].replace(/,/g, ""));
}

/** Where each visible card links to, in order. */
export async function cardLinks(page: Page): Promise<string[]> {
  await expect(cards(page).first()).toBeVisible();
  return cards(page).evaluateAll((items) =>
    items.map((item) => item.querySelector("a")?.getAttribute("href") ?? ""),
  );
}

/** The listing ids of the visible cards. */
export async function cardIds(page: Page): Promise<number[]> {
  return (await cardLinks(page)).map((href) => Number(href.split("/rooms/")[1].split("?")[0]));
}

export function accountPicker(page: Page): Locator {
  return page.getByRole("dialog", { name: "Log in or sign up" });
}

/** Chooses an account in the open picker and waits for the page to come back signed in. */
export async function chooseAccount(page: Page, name: string): Promise<void> {
  await accountPicker(page).getByRole("button", { name: new RegExp(name) }).click();
  await expect(profileNav(page).getByRole("link", { name: `Profile: ${name}` })).toBeVisible();
}

export async function signIn(page: Page, name: string): Promise<void> {
  await profileNav(page).getByRole("button", { name: "Log in or sign up" }).click();
  await chooseAccount(page, name);
}

export async function openMenu(page: Page): Promise<void> {
  await profileNav(page).getByRole("button", { name: "Main navigation menu" }).click();
}

/**
 * Follows "Next" to the last page and returns the listing ids of each page. `nav` is the
 * accessible name of the pagination.
 */
export async function walkPages(page: Page, nav: string): Promise<number[][]> {
  const pages: number[][] = [];
  for (;;) {
    pages.push(await cardIds(page));
    const next = page.getByRole("navigation", { name: nav }).getByRole("link", { name: "Next" });
    if ((await next.count()) === 0) return pages;
    const href = await next.getAttribute("href");
    await next.click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === href);
    await expect(
      page.getByRole("navigation", { name: nav }).getByLabel(new RegExp(`^Page ${pages.length + 1} of`)),
    ).toHaveAttribute("aria-current", "page");
  }
}

/** A date `days` from today, as the URL writes it. */
export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
