import type { ReactNode } from "react";

type Props = {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** "sm": the filter row (capture B1). "lg": inside the filters modal (capture B6). */
  size?: "sm" | "lg";
  icon?: ReactNode;
};

const SIZES = {
  sm: "h-[34px] rounded-3xl px-3 text-xs leading-4",
  lg: "h-12 rounded-[28px] px-4 text-sm leading-[18px]",
};

/**
 * An on/off pill: white with a hairline border; when on, a dark border and the surface
 * tint. The "on" look is ours: no capture shows a selected chip.
 */
export function Chip({ selected, onToggle, children, size = "sm", icon }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={`inline-flex shrink-0 items-center gap-2 border whitespace-nowrap transition-colors ${SIZES[size]} ${
        selected
          ? "border-ink bg-surface shadow-[inset_0_0_0_1px_var(--color-ink)]"
          : "border-line bg-white hover:border-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
