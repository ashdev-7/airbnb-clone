import { House, Search } from "lucide-react";

/*
 * Phase 5 draws the search bar; its three panels (where, when, who) and the search
 * itself arrive in Phase 6 (plan §15). Until then the parts are buttons without a panel.
 */

const FIELDS = [
  { label: "Where", hint: "Search destinations", width: "w-[278px]" },
  { label: "When", hint: "Add dates", width: "w-[283px]" },
  { label: "Who", hint: "Add guests", width: "flex-1" },
];

/** The open bar of capture A1: 850 × 66, fully rounded, three fields and a 48 px button. */
export function SearchBar() {
  return (
    <div
      role="search"
      className="relative flex h-[66px] w-[850px] max-w-full items-center rounded-full border border-line bg-white shadow-raised"
    >
      {FIELDS.map(({ label, hint, width }, index) => (
        <div key={label} className={`flex h-full items-center ${width}`}>
          {index > 0 && <span aria-hidden className="h-8 w-px shrink-0 bg-line" />}
          <button
            type="button"
            className="flex h-full flex-1 flex-col justify-center rounded-full px-8 text-left hover:bg-line-soft"
          >
            <span className="pb-0.5 text-xs leading-4 font-medium">{label}</span>
            <span className="text-sm leading-[18px] text-muted">{hint}</span>
          </button>
        </div>
      ))}
      <button
        type="button"
        aria-label="Search"
        className="absolute right-[9px] flex size-12 items-center justify-center rounded-full bg-action text-white"
      >
        <Search size={16} strokeWidth={3} aria-hidden />
      </button>
    </div>
  );
}

const COMPACT = [
  { label: "Anywhere", sr: "Location" },
  { label: "Anytime", sr: "Check in / Check out" },
  { label: "Add guests", sr: "Guests" },
];

/** The pill the bar shrinks to once the page is scrolled (capture A2): 46 px tall. */
export function CompactSearch({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      role="search"
      className="flex h-[46px] items-center rounded-full border border-line bg-white pr-[6px] shadow-pill"
    >
      {COMPACT.map(({ label, sr }, index) => (
        <div key={label} className="flex h-full items-center">
          {index > 0 && <span aria-hidden className="h-6 w-px bg-line" />}
          <button
            type="button"
            onClick={onOpen}
            className={`flex h-full items-center gap-2 rounded-full text-sm leading-[22px] font-medium ${
              index === 0 ? "pr-4 pl-4" : "px-4"
            }`}
          >
            {index === 0 && <House size={22} strokeWidth={1.75} aria-hidden />}
            <span className="sr-only">{sr}: </span>
            {label}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Search"
        className="flex size-8 items-center justify-center rounded-full bg-action text-white"
      >
        <Search size={12} strokeWidth={3.5} aria-hidden />
      </button>
    </div>
  );
}
