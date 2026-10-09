"use client";

import { ConciergeBell, Earth, House, Ticket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string; icon: LucideIcon };

/** Labels: REF-H1. Experiences and Services lead to "Coming soon" pages (plan §6.11). */
const TABS: Tab[] = [
  { label: "All", href: "/", icon: Earth },
  { label: "Homes", href: "/s/homes", icon: House },
  { label: "Experiences", href: "/experiences", icon: Ticket },
  { label: "Services", href: "/services", icon: ConciergeBell },
];

/**
 * The tabs of capture A1: 14 px medium labels, the active one dark with a 3 px bar
 * under it, the others grey. The original's illustrations are its own; ours are icons.
 */
export function HeaderTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Categories" className="flex items-start gap-[35px]">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex h-12 items-start gap-2 text-sm leading-[18px] font-medium ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <span className="flex h-9 items-center gap-2">
              <Icon size={24} strokeWidth={1.75} aria-hidden />
              {label}
            </span>
            <span
              aria-hidden
              className={`absolute inset-x-0 bottom-[1px] h-[3px] rounded-full ${
                active ? "bg-ink" : "bg-transparent group-hover:bg-line"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
