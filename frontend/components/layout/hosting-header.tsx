"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { UserNav } from "./user-nav";

/**
 * Entries as capture F11 shows them. Calendar and Messages are not built: they lead to
 * "Coming soon" pages (plan §6.2, §6.11).
 */
const LINKS = [
  { label: "Today", href: "/hosting" },
  { label: "Calendar", href: "/hosting/calendar" },
  { label: "Listings", href: "/hosting/listings" },
  { label: "Messages", href: "/hosting/messages" },
];

/**
 * The hosting header (capture F11): three columns in a 96 px bar; the centre links are
 * 40 px tall with 12 px padding, the current one dark with a thin bar under its label.
 */
export function HostingHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[100] border-b border-line-soft bg-white">
      <div className="grid h-header grid-cols-[1fr_auto_1fr] items-center px-gutter max-md:h-auto max-md:grid-cols-[1fr_auto]">
        <div>
          <BrandMark />
        </div>
        <nav
          aria-label="Primary"
          className="flex items-center gap-2 max-md:order-3 max-md:col-span-2 max-md:-mx-3 max-md:overflow-x-auto max-md:pb-2"
        >
          {LINKS.map(({ label, href }) => {
            const active = href === "/hosting" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-control px-3 py-[11px] text-sm leading-[18px] font-medium hover:bg-surface ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                <span className="relative">
                  {label}
                  {active && (
                    <span aria-hidden className="absolute inset-x-0 -bottom-[5px] h-[1.5px] bg-ink" />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
        <UserNav hostingArea />
      </div>
    </header>
  );
}
