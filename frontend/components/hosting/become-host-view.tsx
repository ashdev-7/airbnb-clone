"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { ListingForm } from "./listing-form";

/** "Become a host": the create form on a page of its own; then on to hosting. */
export function BecomeHostView() {
  const router = useRouter();
  const { user, isLoading, requestLogin } = useCurrentUser();
  const hydrated = useHydrated();

  return (
    <main className="mx-auto w-full max-w-[780px] flex-1 px-6 py-10">
      <h1 className="pb-2 text-[32px] leading-9 font-semibold tracking-[-0.96px]">Become a host</h1>
      <p className="pb-6 text-muted">Tell us about your place. It is listed as soon as you publish it.</p>
      {!hydrated || isLoading ? (
        <Skeleton className="h-64 rounded-control" />
      ) : !user ? (
        <Button onClick={() => requestLogin()}>Log in</Button>
      ) : (
        <ListingForm onDone={() => router.push("/hosting")} />
      )}
    </main>
  );
}
