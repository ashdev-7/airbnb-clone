import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("a host creates a listing, removes it and sees their reservations", async ({ page }) => {
  await page.goto("/");
  await signIn(page, "Vikram Mehta");
  await page.goto("/hosting");

  // A photo address the image host is known to serve: one from a seeded listing.
  const seeded = await (await page.request.get("/api/listings/40")).json();
  const title = `Smoke test flat ${Date.now()}`;

  await page.getByRole("button", { name: "Create listing" }).click();
  const form = page.getByRole("dialog", { name: "Create listing" });
  await form.getByLabel("Title").fill(title);
  await form.getByLabel("Description").fill("A quiet flat near the lake, made by the smoke test.");
  await form.getByLabel("City").fill("Udaipur");
  await form.getByLabel("State").fill("Rajasthan");
  await form.getByLabel("Price per night (₹)").fill("4000");
  await form.getByLabel("Photo URLs (one https address per line)").fill(seeded.photos[0]);
  await form.getByRole("button", { name: "Publish listing" }).click();

  await expect(page.getByText("Listing published")).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("button", { name: `Remove ${title}` }).click();
  await page
    .getByRole("dialog", { name: "Remove this listing?" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.getByText("Listing removed")).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);

  await page.getByRole("tab", { name: "Reservations" }).click();
  await expect(
    page.getByRole("list", { name: "Reservations" }).getByRole("listitem").first().or(page.getByText("No reservations yet")),
  ).toBeVisible();
});
