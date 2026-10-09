import { BrandMark } from "./brand-mark";

/** The checkout header (capture D1): the mark alone, 80 px tall, 24 px in, a hairline below. */
export function CheckoutHeader() {
  return (
    <header className="flex h-header-checkout items-center pl-6 shadow-[0_1px_0_0_var(--color-line-soft)]">
      <BrandMark />
    </header>
  );
}
