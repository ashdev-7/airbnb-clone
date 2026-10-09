"use client";

import { CircleHelp, CircleUserRound, Globe, Heart, Luggage, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@/types/api";

const ROW =
  "flex min-h-9 w-full items-center gap-2.5 px-6 py-[9px] text-left text-sm leading-[18px] hover:bg-surface";

function Divider() {
  return <div aria-hidden className="mx-6 my-2 h-px bg-line" />;
}

function Row({ href, onSelect, children }: { href?: string; onSelect: () => void; children: ReactNode }) {
  if (href) {
    return (
      <Link href={href} onNavigate={onSelect} className={ROW}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onSelect} className={ROW}>
      {children}
    </button>
  );
}

type Props = {
  user: User | null;
  /** Called with what the row should do, after the menu has closed. */
  onClose: () => void;
  onLogin: () => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
  onLanguage: () => void;
  /** Where "Become a host" or the hosting switch leads. */
  onHosting: () => void;
};

/**
 * The account menu. Signed out it follows capture A6; signed in, capture G2: four medium
 * rows with icons (Wishlists, Trips, Messages, Profile), then the general rows, the
 * hosting row, and the way out. "Notifications", "Account settings", "Refer a host" and
 * "Find a co-host" of the original are not in this project; "Switch account" is ours,
 * because login is mocked (plan D4).
 */
export function AccountMenu({
  user,
  onClose,
  onLogin,
  onSwitchAccount,
  onLogout,
  onLanguage,
  onHosting,
}: Props) {
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  const general = (
    <>
      <Row onSelect={run(onLanguage)}>
        <Globe size={16} aria-hidden />
        Languages &amp; currency
      </Row>
      {/* Inert: there is no help centre in this project (plan §6.2). */}
      <Row onSelect={onClose}>
        <CircleHelp size={16} aria-hidden />
        Help Centre
      </Row>
    </>
  );

  const hosting = user?.is_host ? (
    <Row onSelect={run(onHosting)}>
      <span className="font-medium">Switch to hosting</span>
    </Row>
  ) : (
    <button type="button" onClick={run(onHosting)} className={`${ROW} flex-col !items-start !gap-0 !py-1`}>
      <span className="font-medium">Become a host</span>
      <span className="text-xs leading-4 text-muted">
        It’s easy to start hosting and earn extra income.
      </span>
    </button>
  );

  return (
    <div className="w-[265px] py-3">
      {user ? (
        <>
          <Row href="/wishlists" onSelect={onClose}>
            <Heart size={16} aria-hidden />
            <span className="font-medium">Wishlists</span>
          </Row>
          <Row href="/trips" onSelect={onClose}>
            <Luggage size={16} aria-hidden />
            <span className="font-medium">Trips</span>
          </Row>
          <Row href="/messages" onSelect={onClose}>
            <MessageSquare size={16} aria-hidden />
            <span className="font-medium">Messages</span>
          </Row>
          <Row href="/users/profile" onSelect={onClose}>
            <CircleUserRound size={16} aria-hidden />
            <span className="font-medium">Profile</span>
          </Row>
          <Divider />
          {general}
          {/* A placeholder row, not a page (plan §6.11). */}
          <Row onSelect={onClose}>
            <span className="flex-1">Verify your identity</span>
            <span className="rounded-md bg-control px-1.5 py-0.5 text-[11px] leading-[15px] font-medium text-muted">
              Coming soon
            </span>
          </Row>
          <Divider />
          {hosting}
          <Divider />
          <Row onSelect={run(onSwitchAccount)}>Switch account</Row>
          <Row onSelect={run(onLogout)}>Log out</Row>
        </>
      ) : (
        <>
          {general}
          <Divider />
          {hosting}
          <Divider />
          <Row onSelect={run(onLogin)}>Log in or sign up</Row>
        </>
      )}
    </div>
  );
}
