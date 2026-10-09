import { expect, test } from "@playwright/test";
import { daysFromNow, signIn } from "./helpers";

test("a guest books a stay: declined card, then approved, then it is in Trips", async ({ page }) => {
  await page.goto("/");
  await signIn(page, "Arjun Kapoor");
  await page.goto(`/book/stays/40?check_in=${daysFromNow(150)}&check_out=${daysFromNow(152)}&adults=1`);
  await expect(page.getByRole("heading", { name: "Confirm and pay", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Price details")).toContainText("Total");
  const pay = page.getByRole("button", { name: "Confirm and pay" });

  // The declining card: an error, and nothing is booked.
  await page.getByRole("radio", { name: /always declined/ }).check();
  await pay.click();
  await expect(page.getByText("Your payment was declined")).toBeVisible();
  await expect(page).toHaveURL(/\/book\/stays\/40/);

  // The approving card: on to the confirmation.
  await page.getByRole("radio", { name: /approves/ }).check();
  await pay.click();
  await expect(page).toHaveURL(/\/trips\/\d+$/);
  await expect(page.getByRole("heading", { name: "Reservation details" })).toBeVisible();
  await expect(page.getByText("Confirmation code")).toBeVisible();
  const id = page.url().split("/trips/")[1];

  await page.goto("/trips");
  await expect(page.getByRole("heading", { name: "Trips", level: 1 })).toBeVisible();
  await expect(page.getByRole("main").locator(`a[href="/trips/${id}"]`)).toBeVisible();
});
