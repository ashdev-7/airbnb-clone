"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getSavedIds, saveListing, unsaveListing } from "@/lib/api/wishlist";
import type { WishlistIds } from "@/types/api";
import { useCurrentUser } from "./use-current-user";
import { useLoginGate } from "./use-login-gate";
import { useToast } from "./use-toast";

const key = (userId: number | undefined) => ["wishlist-ids", userId] as const;

/**
 * Which listings the current user has saved, and the heart's toggle. The change shows at
 * once and is undone if the server refuses it. Both requests are idempotent on the
 * server, so a retry or a double click cannot leave the list in a wrong state.
 */
export function useWishlist() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const gate = useLoginGate();
  const queryKey = key(user?.id);

  const saved = useQuery({ queryKey, queryFn: getSavedIds, enabled: user !== null });

  const mutation = useMutation({
    mutationFn: ({ listingId, save }: { listingId: number; save: boolean }) =>
      save ? saveListing(listingId) : unsaveListing(listingId),
    onMutate: async ({ listingId, save }) => {
      await queryClient.cancelQueries({ queryKey });
      const before = queryClient.getQueryData<WishlistIds>(queryKey);
      const ids = (before?.ids ?? []).filter((id) => id !== listingId);
      queryClient.setQueryData<WishlistIds>(queryKey, { ids: save ? [...ids, listingId] : ids });
      return { before };
    },
    onSuccess: (_data, { save }) => {
      toast.show(save ? "Saved to Wishlist" : "Removed from Wishlist");
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.before);
      toast.show("Something went wrong, try again.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const { mutate } = mutation;
  const ids = saved.data?.ids;

  const isSaved = useCallback((listingId: number) => ids?.includes(listingId) ?? false, [ids]);

  /** Saves without asking who is signed in; used when resuming after sign-in. */
  const save = useCallback(
    (listingId: number) => mutate({ listingId, save: true }),
    [mutate],
  );

  const toggle = useCallback(
    (listingId: number) => {
      gate({ kind: "save", listingId }, () =>
        mutate({ listingId, save: !(ids?.includes(listingId) ?? false) }),
      );
    },
    [gate, mutate, ids],
  );

  return { isSaved, toggle, save };
}
