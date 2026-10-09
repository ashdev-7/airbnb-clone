"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { inOverlay, overlayOpen } from "@/components/ui/overlay";
import { useCloseWhenHidden } from "@/components/ui/use-close-when-hidden";
import { formatDateRange, formatDay } from "@/lib/format";
import { guestSummary } from "@/lib/guests";
import { searchHref, type SearchState } from "@/lib/search-params";
import { DateRangeCalendar } from "./date-range-calendar";
import { WherePanel } from "./where-panel";
import { WhoPanel } from "./who-panel";

export type SearchField = "where" | "when" | "who";

type Props = {
  /** The search in the address bar; the bar starts from it and edits a copy. */
  initial: SearchState;
  /** Which panel to open at once (a part of the compact pill was clicked). */
  openField?: SearchField | null;
  /** Called when the bar is put away: a search was made, or the visitor clicked elsewhere. */
  onDismiss?: () => void;
};

/* On a phone the three parts stack, each a row of its own (bonus B6). */
const SEGMENT =
  "relative z-[1] flex h-full flex-col justify-center rounded-full text-left max-md:h-14 max-md:!w-full max-md:flex-none";
const LIFTED = "bg-white shadow-[0_3px_12px_rgb(0_0_0/0.1),0_1px_2px_rgb(0_0_0/0.08)]";
const PANEL =
  "absolute top-[78px] z-[2] rounded-[32px] bg-white shadow-raised max-md:static max-md:mt-2 max-md:w-full max-md:overflow-hidden";

/**
 * The search bar of capture A1 (850 × 66), with its three panels (A3, A4, A5). While a
 * panel is open the bar turns grey and the part in use is lifted on white (A3). Nothing
 * is searched until the button is pressed; the search then becomes the address of the
 * results page, which is the only place its state is kept.
 */
export function SearchBar({ initial, openField = null, onDismiss }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [active, setActive] = useState<SearchField | null>(openField);
  const root = useRef<HTMLDivElement>(null);
  const whereInput = useRef<HTMLInputElement>(null);

  const dismiss = () => {
    setActive(null);
    onDismiss?.();
  };
  useCloseWhenHidden(() => setActive(null));

  useEffect(() => {
    if (active === "where") whereInput.current?.focus();
    if (active === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !inOverlay(event.target)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !overlayOpen()) dismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    // Capture phase, so this runs before an open modal handles the key and closes itself.
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    // `dismiss` only wraps setters and the latest onDismiss; re-subscribing per render is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function submit() {
    router.push(searchHref({ ...draft, location: draft.location.trim(), page: 1 }));
    dismiss();
  }

  const { checkIn, checkOut } = draft;
  const dates = checkIn ? (checkOut ? formatDateRange(checkIn, checkOut) : formatDay(checkIn)) : null;
  const guests = guestSummary(draft.guests);
  const rule = (hidden: boolean) => (
    <span aria-hidden className={`h-8 w-px shrink-0 max-md:hidden ${hidden ? "bg-transparent" : "bg-line"}`} />
  );
  const value = (text: string | null, placeholder: string): ReactNode => (
    <span className={`truncate text-sm leading-[18px] ${text ? "font-medium" : "text-muted"}`}>
      {text ?? placeholder}
    </span>
  );

  return (
    <div ref={root} className="relative w-[850px] max-w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className={`flex h-[66px] items-center rounded-full border border-line max-md:h-auto max-md:flex-col max-md:items-stretch max-md:rounded-[32px] ${
          active ? "bg-line-soft" : "bg-white shadow-raised"
        }`}
      >
        <label
          className={`${SEGMENT} w-[278px] cursor-text px-8 ${active === "where" ? LIFTED : "hover:bg-line-soft"}`}
        >
          <span className="pb-0.5 text-xs leading-4 font-medium">Where</span>
          <input
            ref={whereInput}
            value={draft.location}
            onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            onFocus={() => setActive("where")}
            placeholder="Search destinations"
            maxLength={200}
            autoComplete="off"
            className="w-full bg-transparent text-sm leading-[18px] font-medium outline-none placeholder:font-normal placeholder:text-muted"
          />
        </label>
        {rule(active === "where" || active === "when")}

        <div className={`${SEGMENT} w-[283px] !flex-row items-center ${active === "when" ? LIFTED : "hover:bg-line-soft"}`}>
          <button
            type="button"
            aria-expanded={active === "when"}
            onClick={() => setActive("when")}
            className="flex h-full min-w-0 flex-1 flex-col justify-center rounded-full pl-6 text-left"
          >
            <span className="pb-0.5 text-xs leading-4 font-medium">When</span>
            {value(dates, "Add dates")}
          </button>
          {dates && active === "when" && (
            <button
              type="button"
              aria-label="Clear dates"
              onClick={() => setDraft({ ...draft, checkIn: null, checkOut: null })}
              className="mr-3 flex size-6 items-center justify-center rounded-full hover:bg-control"
            >
              <X size={12} strokeWidth={3} aria-hidden />
            </button>
          )}
        </div>
        {rule(active === "when" || active === "who")}

        <div className={`${SEGMENT} flex-1 !flex-row items-center ${active === "who" ? LIFTED : "hover:bg-line-soft"}`}>
          <button
            type="button"
            aria-expanded={active === "who"}
            onClick={() => setActive("who")}
            className="flex h-full min-w-0 flex-1 flex-col justify-center rounded-full pl-6 text-left"
          >
            <span className="pb-0.5 text-xs leading-4 font-medium">Who</span>
            {value(guests, "Add guests")}
          </button>
          <button
            type="submit"
            aria-label="Search"
            className="mr-[9px] flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-full bg-action px-4 text-base font-medium text-white"
          >
            <Search size={16} strokeWidth={3} aria-hidden />
            {active && <span aria-hidden>Search</span>}
          </button>
        </div>
      </form>

      {active === "where" && (
        <div className={`${PANEL} left-0`}>
          <WherePanel
            text={draft.location}
            onChoose={(location) => {
              setDraft({ ...draft, location });
              setActive("when");
            }}
          />
        </div>
      )}
      {active === "when" && (
        <div className={`${PANEL} inset-x-0 px-[29px] pt-4 pb-8 max-md:px-2`}>
          <DateRangeCalendar
            value={{ checkIn, checkOut }}
            onChange={(next) => {
              setDraft({ ...draft, ...next });
              if (next.checkOut) setActive("who");
            }}
          />
        </div>
      )}
      {active === "who" && (
        <div className={`${PANEL} right-0`}>
          <WhoPanel value={draft.guests} onChange={(next) => setDraft({ ...draft, guests: next })} />
        </div>
      )}
    </div>
  );
}
