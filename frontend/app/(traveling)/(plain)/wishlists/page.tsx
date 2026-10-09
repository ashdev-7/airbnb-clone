import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlists/wishlist-view";

export const metadata: Metadata = { title: "Wishlists" };

/** Wishlists (plan §6.9; capture E2): a 32 px heading over the saved homes, 1280 px wide. */
export default function WishlistsPage() {
  return (
    <main className="mx-auto w-[1280px] max-w-[calc(100vw-96px)] flex-1 pt-[76px] pb-16">
      <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.96px]">Wishlists</h1>
      <WishlistView />
    </main>
  );
}
