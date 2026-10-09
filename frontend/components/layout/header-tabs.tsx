"use client";

import { ConciergeBell, Earth, House, Ticket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** `width` and `labelLeft` are the tab's box and where its label starts, from capture A1. */
type Tab = { label: string; href: string; icon: LucideIcon; width: number; labelLeft: number };

/** Labels: REF-H1. Experiences and Services lead to "Coming soon" pages (plan §6.11). */
const TABS: Tab[] = [
  { label: "All", href: "/", icon: Earth, width: 71, labelLeft: 44 },
  { label: "Homes", href: "/s/homes", icon: House, width: 98.5, labelLeft: 52 },
  { label: "Experiences", href: "/experiences", icon: Ticket, width: 124.7, labelLeft: 44 },
  { label: "Services", href: "/services", icon: ConciergeBell, width: 103.7, labelLeft: 48 },
];

const ICON_BOX = 36;
const ICON_GAP = 8;

/**
 * The tabs of capture A1: four boxes 35 px apart, each a 36 px picture and a 14 px medium
 * label; the active one dark with a 3 px bar 8 px under it. Box widths and label positions
 * are the captured ones, so the row sits where the original's does. The original's
 * pictures are its own artwork; ours are Lucide icons in the same 36 px box.
 */
export function HeaderTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Categories" className="flex h-12 gap-[35px]">
      {TABS.map(({ label, href, icon: Icon, width, labelLeft }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{ width }}
            className={`group relative h-12 text-sm leading-[18px] font-medium ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <span
              aria-hidden
              style={{ left: labelLeft - ICON_GAP - ICON_BOX, width: ICON_BOX, height: ICON_BOX }}
              className="absolute top-0 flex items-center justify-center"
            >
              <Icon size={26} strokeWidth={1.6} />
            </span>
            <span style={{ left: labelLeft }} className="absolute top-[9px] whitespace-nowrap">
              {label}
            </span>
            <span
              aria-hidden
              className={`absolute inset-x-0 top-[44px] h-[3px] rounded-full ${
                active ? "bg-ink" : "bg-transparent group-hover:bg-line"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
