"use client";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

/** Shown on pages that need an account when nobody is signed in (plan §6.1). */
export function LoginPrompt({ line }: { line: string }) {
  const { requestLogin } = useCurrentUser();
  return (
    <div className="pt-6">
      <p className="max-w-[480px] pb-6 text-base leading-6 text-muted">{line}</p>
      <Button onClick={() => requestLogin()}>Log in</Button>
    </div>
  );
}
