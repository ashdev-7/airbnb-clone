import { Search } from "lucide-react";
import Image from "next/image";
import { formatDateRange, shortPlace } from "@/lib/format";
import { guestSummary } from "@/lib/guests";
import type { SearchState } from "@/lib/search-params";
import type { SearchField } from "./search-bar";

type Props = { search: SearchState; onOpen: (field: SearchField) => void };

/**
 * The pill the bar shrinks to (captures A2 and B1): 46 px tall, three parts split by
 * 24 px rules and a 32 px button. It shows the search in the address bar: "Homes in Goa ·
 * 29–30 Oct · 2 guests", or "Anywhere · Anytime · Add guests" when nothing is set.
 */
export function CompactSearch({ search, onOpen }: Props) {
  const parts: { field: SearchField; name: string; text: string }[] = [
    {
      field: "where",
      name: "Location",
      text: search.location ? `Homes in ${shortPlace(search.location)}` : "Anywhere",
    },
    {
      field: "when",
      name: "Check in / Check out",
      text: search.checkIn && search.checkOut ? formatDateRange(search.checkIn, search.checkOut) : "Anytime",
    },
    { field: "who", name: "Guests", text: guestSummary(search.guests) ?? "Add guests" },
  ];

  return (
    <div
      role="search"
      className="flex h-[46px] max-w-[min(560px,calc(100vw-560px))] items-center max-lg:max-w-[calc(100vw-340px)] max-md:w-full max-md:max-w-none rounded-full border border-line bg-white pr-[6px] shadow-pill"
    >
      {parts.map(({ field, name, text }, index) => (
        <div key={field} className="flex h-full min-w-0 items-center max-md:flex-1">
          {index > 0 && <span aria-hidden className="h-6 w-px shrink-0 bg-line" />}
          <button
            type="button"
            onClick={() => onOpen(field)}
            className="flex h-full min-w-0 items-center gap-2 rounded-full px-4 text-sm leading-[22px] font-medium max-md:flex-1 max-md:px-2.5"
          >
            {index === 0 && <Image src="/icons/house.png" alt="" width={28} height={28} className="-ml-1 shrink-0" />}
            <span className="sr-only">{name}: </span>
            <span className="truncate">{text}</span>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onOpen("where")}
        aria-label="Search"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-white"
      >
        <Search size={12} strokeWidth={3.5} aria-hidden />
      </button>
    </div>
  );
}
