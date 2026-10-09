"use client";

import { Stepper } from "@/components/ui/stepper";
import { useMeta } from "@/hooks/use-meta";
import { GUEST_ROWS, maxFor, minFor, setGuests, type GuestCounts } from "@/lib/guests";

type Props = { value: GuestCounts; onChange: (value: GuestCounts) => void };

/**
 * The "Who" panel (capture A5): 425 px wide under the right of the bar; four rows 90 px
 * apart, each a 16 px medium name over a grey age line, with a stepper on the right.
 * Limits come from the server through /api/meta (lib/guests.ts).
 */
export function WhoPanel({ value, onChange }: Props) {
  const { guestLimits } = useMeta();

  return (
    <ul className="w-[425px] px-10 py-4">
      {GUEST_ROWS.map(({ kind, label, hint }) => (
        <li
          key={kind}
          className="flex items-center justify-between border-b border-line-soft py-6 last:border-b-0"
        >
          <div>
            <h3 className="text-base leading-5 font-medium">{label}</h3>
            <p className="pt-1 text-sm leading-[18px] text-muted">{hint}</p>
          </div>
          <Stepper
            label={label}
            value={value[kind]}
            min={minFor(kind, value, guestLimits)}
            max={maxFor(kind, value, guestLimits)}
            onChange={(next) => onChange(setGuests(value, kind, next, guestLimits))}
          />
        </li>
      ))}
    </ul>
  );
}
