import { formatMoney, plural } from "@/lib/format";
import { SITE_NAME } from "@/lib/config";
import type { Quote } from "@/types/api";

/**
 * The price breakdown (R-LD-4), laid out like "Price details" in capture C11: 16 px lines
 * with the amount at the right, a rule, then the total in medium weight. Every number is
 * the server's (plan §10.4); nothing is added up here.
 */
export function PriceBreakdown({ quote }: { quote: Quote }) {
  const lines: [string, number][] = [
    [`${plural(quote.nights, "night")} x ${formatMoney(quote.nightly_price_minor)}`, quote.nights_total_minor],
  ];
  if (quote.cleaning_fee_minor > 0) lines.push(["Cleaning fee", quote.cleaning_fee_minor]);
  lines.push([`${SITE_NAME} service fee`, quote.service_fee_minor]);

  return (
    <dl aria-label="Price details" className="text-base leading-5">
      {lines.map(([label, amount]) => (
        <div key={label} className="flex justify-between gap-4 pb-4">
          <dt>{label}</dt>
          <dd>{formatMoney(amount)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-line pt-6 font-medium">
        <dt>Total</dt>
        <dd>{formatMoney(quote.total_minor)}</dd>
      </div>
    </dl>
  );
}
