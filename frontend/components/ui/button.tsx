import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "outline" | "ghost" | "soft";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Shows a spinner and blocks further clicks while a request is on its way. */
  pending?: boolean;
};

/*
 * primary: the gradient button of capture A7 ("Continue").
 * dark: the solid button of capture A1 ("Got it").
 * outline: the bordered buttons of capture A7.
 * ghost: the text button of the header ("Become a host", capture A1).
 * soft: the grey button of the listing page ("Show all 10 amenities", capture C7).
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "h-12 rounded-control px-6 text-base leading-5 font-medium text-white [background:var(--gradient-primary)]",
  dark: "h-12 rounded-control bg-ink px-6 text-base leading-5 font-medium text-paper",
  outline:
    "h-12 rounded-control border border-line bg-paper px-6 text-sm font-medium text-ink hover:bg-surface",
  ghost: "h-10 rounded-full px-3 text-sm leading-[18px] font-medium text-ink hover:bg-control",
  soft: "h-12 rounded-control bg-control px-6 text-base leading-5 font-medium text-ink hover:bg-line-soft",
};

export function Button({
  variant = "primary",
  pending = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {pending && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
