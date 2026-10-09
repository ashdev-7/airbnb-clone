import { expect, test, type Page } from "@playwright/test";
import { freeListing, nextMonth, signedIn } from "./helpers";

const [FIRST, MIDDLE, LEAVE, LATER] = [nextMonth(10), nextMonth(11), nextMonth(12), nextMonth(14)];
const SEEDED = Array.from({ length: 60 }, (_, index) => 60 + index);

const day = (page: Page, date: string) =>
  page.getByRole("region", { name: "Select check-in date" }).locator(`[data-day="${date}"] button`);

/** Journey J3 (plan §13): one guest's booking blocks those nights for everyone else. */
test("a booking blocks its nights for another guest, in the calendar and at checkout", async ({ browser }) => {
  const guestA = await signedIn(browser, "Arjun Kapoor");
  const guestB = await signedIn(browser, "Meera Iyer");
  const id = await freeListing(guestA, SEEDED, FIRST, LATER);
  const stay = `check_in=${FIRST}&check_out=${LEAVE}&adults=1`;

  // Before: B sees the nights free, and gets as far as checkout.
  await guestB.goto(`/rooms/${id}`);
  await expect(day(guestB, FIRST)).toBeEnabled();
  await guestB.goto(`/book/stays/${id}?${stay}`);
  await expect(guestB.getByLabel("Price details")).toContainText("Total");

  // A books them.
  await guestA.goto(`/book/stays/${id}?${stay}`);
  await guestA.getByRole("button", { name: "Confirm and pay" }).click();
  await expect(guestA).toHaveURL(/\/trips\/\d+$/);

  // B, still on checkout with the old price, is refused and nothing is booked.
  await guestB.getByRole("button", { name: "Confirm and pay" }).click();
  await expect(guestB.getByText("Those dates were just booked by someone else.")).toBeVisible();
  await expect(guestB).toHaveURL(new RegExp(`/book/stays/${id}`));

  // B's calendar: A's nights cannot be chosen; the day A leaves can (back-to-back stays).
  await guestB.goto(`/rooms/${id}`);
  await expect(day(guestB, FIRST)).toBeDisabled();
  await expect(day(guestB, MIDDLE)).toBeDisabled();
  await expect(day(guestB, LEAVE)).toBeEnabled();

  // With the taken dates in the address, the card says so and offers no way on.
  await guestB.goto(`/rooms/${id}?${stay}`);
  await expect(guestB.getByText("Those dates are not available.").first()).toBeVisible();

  // A stay starting the day A leaves succeeds.
  await guestB.goto(`/book/stays/${id}?check_in=${LEAVE}&check_out=${LATER}&adults=1`);
  await guestB.getByRole("button", { name: "Confirm and pay" }).click();
  await expect(guestB).toHaveURL(/\/trips\/\d+$/);

  // A, coming back to the listing without a reload, sees both stays blocked.
  await guestA.goto(`/rooms/${id}`);
  await expect(day(guestA, FIRST)).toBeDisabled();
  await expect(day(guestA, LEAVE)).toBeDisabled();
});
