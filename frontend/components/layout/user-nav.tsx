"use client";

import { CircleUserRound, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { AccountMenu } from "./account-menu";
import { LanguageModal } from "./language-modal";

const HOSTING_HOME = "/hosting";
const CREATE_LISTING = "/become-a-host";

const TEXT_LINK =
  "inline-flex h-10 items-center rounded-full px-3 text-sm leading-[18px] font-medium hover:bg-control";
const DISC = "flex size-10 items-center justify-center rounded-full bg-control";

type Props = {
  /** The hosting header replaces the host link with "Switch to travelling" (capture F11). */
  hostingArea?: boolean;
};

/**
 * The right side of every header (captures A1, E1, F11): the hosting link, the account
 * disc and the menu button, each 40 px tall and 12 px apart.
 */
export function UserNav({ hostingArea = false }: Props) {
  const { user, isLoading, requestLogin, signOut } = useCurrentUser();
  const toast = useToast();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  // Hosting needs an account: signed out, the link opens the account picker first.
  function goHosting() {
    const href = user?.is_host ? HOSTING_HOME : CREATE_LISTING;
    if (user) router.push(href);
    else requestLogin({ kind: "visit", href: CREATE_LISTING });
  }

  async function logOut() {
    try {
      await signOut();
    } catch {
      toast.show("Something went wrong, try again.");
    }
  }

  let hostLink;
  if (isLoading) hostLink = <Skeleton className="h-5 w-24 rounded-full" />;
  else if (hostingArea) {
    hostLink = (
      <Link href="/" className={TEXT_LINK}>
        Switch to travelling
      </Link>
    );
  } else if (user) {
    hostLink = (
      <Link href={user.is_host ? HOSTING_HOME : CREATE_LISTING} className={TEXT_LINK}>
        {user.is_host ? "Switch to hosting" : "Become a host"}
      </Link>
    );
  } else {
    hostLink = (
      <button type="button" onClick={goHosting} className={TEXT_LINK}>
        Become a host
      </button>
    );
  }

  return (
    <nav aria-label="Profile" className="flex h-20 items-center justify-end gap-3">
      {hostLink}

      {user ? (
        <span title={user.name} aria-label={`Signed in as ${user.name}`} className={DISC}>
          <Avatar name={user.name} avatarUrl={user.avatar_url} />
        </span>
      ) : (
        <button
          type="button"
          aria-label="Log in or sign up"
          disabled={isLoading}
          onClick={() => requestLogin()}
          className={DISC}
        >
          <CircleUserRound size={24} strokeWidth={1.75} aria-hidden />
        </button>
      )}

      <Popover
        open={menuOpen}
        onOpenChange={setMenuOpen}
        trigger={
          <button type="button" aria-label="Main navigation menu" className={DISC}>
            <Menu size={16} strokeWidth={2.5} aria-hidden />
          </button>
        }
      >
        <AccountMenu
          user={user}
          onClose={() => setMenuOpen(false)}
          onLogin={() => requestLogin()}
          onSwitchAccount={() => requestLogin()}
          onLogout={logOut}
          onLanguage={() => setLanguageOpen(true)}
          onHosting={goHosting}
        />
      </Popover>

      <LanguageModal open={languageOpen} onOpenChange={setLanguageOpen} />
    </nav>
  );
}
