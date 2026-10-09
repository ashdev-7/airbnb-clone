"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  /** Names the quantity for screen readers: "Increase Adults". */
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** How the value is written; the filters modal shows "Any" for zero (capture B5). */
  format?: (value: number) => string;
};

const BUTTON =
  "flex size-8 items-center justify-center rounded-full bg-control text-ink disabled:text-faint";

/** The − value + control of capture A5. Limits come from the caller (lib/guests.ts). */
export function Stepper({ label, value, min, max, onChange, format = String }: Props) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={BUTTON}
      >
        <Minus size={12} strokeWidth={3} aria-hidden />
      </button>
      <span aria-hidden className="min-w-9 px-2 text-center text-base">
        {format(value)}
      </span>
      <span className="sr-only" aria-live="polite">
        {format(value)} {label}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={BUTTON}
      >
        <Plus size={12} strokeWidth={3} aria-hidden />
      </button>
    </div>
  );
}
