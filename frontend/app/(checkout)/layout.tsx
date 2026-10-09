import { CheckoutHeader } from "@/components/layout/checkout-header";

/** The checkout pages: the minimal header and nothing else around them (plan §7.4). */
export default function CheckoutLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <CheckoutHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
