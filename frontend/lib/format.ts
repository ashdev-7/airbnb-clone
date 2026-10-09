/** How values are written on screen: money, ratings, counts (plan §7.4). */

const MINOR_PER_RUPEE = 100;

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 450000 paise → "₹4,500". Prices are whole rupees; any paise are rounded (capture B1). */
export function formatMoney(minor: number): string {
  return rupees.format(Math.round(minor / MINOR_PER_RUPEE));
}

/**
 * Ratings as the captures show them: two decimals, with one trailing zero dropped
 * ("4.84", "4.9", "5.0").
 */
export function formatRating(average: number): string {
  const text = average.toFixed(2);
  return text.endsWith("0") ? text.slice(0, -1) : text;
}

/** "{Property type} in {city}", the first line of a card (REF-I2). */
export function listingHeadline(propertyType: string, city: string): string {
  return `${propertyType} in ${city}`;
}
