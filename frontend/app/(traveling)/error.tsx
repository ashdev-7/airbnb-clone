"use client";

import { Button } from "@/components/ui/button";

/** The error state of the travelling pages: a message and a way to try again (plan §6.13). */
export default function TravelingError({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-24 text-center">
      <h1 className="text-xl leading-6 font-semibold tracking-[-0.18px]">
        Something went wrong
      </h1>
      <p className="text-muted">We could not load this page. Check your connection and try again.</p>
      <Button variant="dark" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}
