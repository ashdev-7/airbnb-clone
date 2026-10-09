"use client";

import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { useWishlist } from "@/hooks/use-wishlist";
import { takeFlash, takePendingAction } from "@/lib/session-handoff";

/**
 * Runs once after a page load that followed a sign-in or log-out: shows the toast left
 * for it, and finishes the action the visitor was in the middle of (plan §6.1).
 */
export function SessionHandoff() {
  const { user, isLoading } = useCurrentUser();
  const toast = useToast();
  const { save } = useWishlist();
  const done = useRef(false);

  useEffect(() => {
    if (isLoading || done.current) return;
    done.current = true;

    const flash = takeFlash();
    if (flash) toast.show(flash);

    const pending = takePendingAction();
    if (pending?.kind === "save" && user) save(pending.listingId);
  }, [isLoading, user, toast, save]);

  return null;
}
