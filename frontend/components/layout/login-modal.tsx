"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { getDemoAccounts } from "@/lib/api/auth";
import type { User } from "@/types/api";
import { BrandIcon } from "./brand-mark";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (account: User) => Promise<void>;
};

/**
 * "Log in or sign up" (REF-H1) in the shell of capture A7. Login is mocked (plan D4): the
 * body lists the seeded accounts, and there is no field for a password, phone or email.
 */
export function LoginModal({ open, onOpenChange, onChoose }: Props) {
  const accounts = useQuery({
    queryKey: ["demo-accounts"],
    queryFn: getDemoAccounts,
    enabled: open,
    staleTime: Infinity,
  });
  const [choosing, setChoosing] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  async function choose(account: User) {
    setChoosing(account.id);
    setFailed(false);
    try {
      await onChoose(account); // ends with a page load
    } catch {
      setChoosing(null);
      setFailed(true);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Log in or sign up"
      titleHidden
      description="Choose an account to continue as."
    >
      <div className="flex flex-col items-center pb-2">
        <BrandIcon size={40} />
        <h2 className="mt-4 text-[26px] leading-[30px] font-semibold tracking-[-0.52px]">
          Log in or sign up
        </h2>
        <p className="mt-2 text-muted">Continue as one of these accounts</p>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {accounts.isPending &&
          Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-[52px] rounded-control" />
            </li>
          ))}
        {accounts.data?.accounts.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              disabled={choosing !== null}
              aria-busy={choosing === account.id || undefined}
              onClick={() => choose(account)}
              className="flex h-[52px] w-full items-center gap-3 rounded-control border border-line px-4 text-left hover:bg-surface disabled:opacity-60"
            >
              <Avatar name={account.name} avatarUrl={account.avatar_url} size={32} />
              <span className="flex-1 text-base font-medium">{account.name}</span>
              <span className="rounded-full bg-control px-2.5 py-1 text-xs font-medium text-muted">
                {account.is_host ? "Host" : "Guest"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {(accounts.isError || failed) && (
        <p role="alert" className="mt-4 text-center text-action">
          Something went wrong, try again.
        </p>
      )}
    </Modal>
  );
}
