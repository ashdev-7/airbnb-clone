import Image from "next/image";
import Link from "next/link";

/** `width` and `labelLeft` are the tab's box and where its label starts, from capture A1. */
type Tab = { label: string; href: string; icon: string; width: number; labelLeft: number };

/** Labels: REF-H1. Experiences and Services lead to "Coming soon" pages (plan §6.11). */
const TABS: Tab[] = [
  { label: "All", href: "/", icon: "globe", width: 71, labelLeft: 44 },
  { label: "Homes", href: "/s/homes", icon: "house", width: 98.5, labelLeft: 52 },
  { label: "Experiences", href: "/experiences", icon: "balloon", width: 124.7, labelLeft: 44 },
  { label: "Services", href: "/services", icon: "bell", width: 103.7, labelLeft: 48 },
];

const ICON_BOX = 36;
const ICON_GAP = 8;

/**
 * The tabs of capture A1: four boxes 35 px apart, each a 36 px picture and a 14 px medium
 * label; the active one dark with a 3 px bar 8 px under it. Box widths and label positions
 * are the captured ones, so the row sits where the original's does.
 *
 * The pictures are Microsoft Fluent Emoji in its 3D style (MIT licence, kept beside the
 * files in public/icons): the original's pictures are its own artwork.
 *
 * The tabs are only shown on the home page, where "All" is the page being viewed.
 */
export function HeaderTabs() {
  return (
    <nav aria-label="Categories" className="flex h-12 gap-[35px]">
      {TABS.map(({ label, href, icon, width, labelLeft }, index) => {
        const active = index === 0;
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
            <Image
              src={`/icons/${icon}.png`}
              alt=""
              width={ICON_BOX}
              height={ICON_BOX}
              style={{ left: labelLeft - ICON_GAP - ICON_BOX }}
              className="absolute top-0 transition-transform group-hover:scale-110"
            />
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
