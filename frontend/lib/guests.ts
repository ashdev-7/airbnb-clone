/**
 * Guest rules (plan §10.8). The server is the authority (bookings/guests.py) and serves
 * its limits from /api/meta; this module uses them to disable steppers and to word the
 * summary. The defaults below are the same numbers, for the moment before /api/meta
 * has answered.
 */

export type GuestCounts = { adults: number; children: number; infants: number; pets: number };
export type GuestKind = keyof GuestCounts;

export type GuestLimits = {
  min_adults: number;
  max_guests: number;
  max_infants: number;
  max_pets: number;
};

/** Captures A5 and C3; pets and the adult minimum are provisional (docs/parity-notes.md). */
export const DEFAULT_GUEST_LIMITS: GuestLimits = {
  min_adults: 1,
  max_guests: 16,
  max_infants: 5,
  max_pets: 5,
};

export const NO_GUESTS: GuestCounts = { adults: 0, children: 0, infants: 0, pets: 0 };

/** The four rows of the panel, with the age text of capture A5. */
export const GUEST_ROWS: { kind: GuestKind; label: string; hint: string }[] = [
  { kind: "adults", label: "Adults", hint: "Ages 13 or above" },
  { kind: "children", label: "Children", hint: "Ages 2–12" },
  { kind: "infants", label: "Infants", hint: "Under 2" },
  { kind: "pets", label: "Pets", hint: "Bringing a service animal?" },
];

/** Adults and children count toward a listing's maximum; infants and pets do not. */
export function countedGuests(counts: GuestCounts): number {
  return counts.adults + counts.children;
}

function hasCompanions(counts: GuestCounts): boolean {
  return counts.children + counts.infants + counts.pets > 0;
}

/** The highest value a row may reach, given the other rows. */
export function maxFor(kind: GuestKind, counts: GuestCounts, limits: GuestLimits): number {
  if (kind === "infants") return limits.max_infants;
  if (kind === "pets") return limits.max_pets;
  return limits.max_guests - countedGuests(counts) + counts[kind];
}

/**
 * The lowest value a row may reach. In a search nobody has to be chosen, so adults may be
 * zero; once a child, infant or pet is added, an adult has to come along.
 */
export function minFor(kind: GuestKind, counts: GuestCounts, limits: GuestLimits): number {
  return kind === "adults" && hasCompanions(counts) ? limits.min_adults : 0;
}

/** Sets one row, kept inside its limits, and brings an adult along where one is needed. */
export function setGuests(
  counts: GuestCounts,
  kind: GuestKind,
  value: number,
  limits: GuestLimits = DEFAULT_GUEST_LIMITS,
): GuestCounts {
  const clamped = Math.min(Math.max(value, minFor(kind, counts, limits)), maxFor(kind, counts, limits));
  const next = { ...counts, [kind]: clamped };
  if (hasCompanions(next) && next.adults < limits.min_adults) next.adults = limits.min_adults;
  return next;
}

/** Brings counts read from a URL inside the limits; anything that is not a count is zero. */
export function sanitizeGuests(
  raw: Partial<Record<GuestKind, number>>,
  limits: GuestLimits = DEFAULT_GUEST_LIMITS,
): GuestCounts {
  const whole = (value: number | undefined, max: number) =>
    Number.isInteger(value) ? Math.min(Math.max(value as number, 0), max) : 0;
  const adults = whole(raw.adults, limits.max_guests);
  const counts: GuestCounts = {
    adults,
    children: whole(raw.children, limits.max_guests - adults),
    infants: whole(raw.infants, limits.max_infants),
    pets: whole(raw.pets, limits.max_pets),
  };
  if (hasCompanions(counts) && counts.adults < limits.min_adults) {
    counts.adults = limits.min_adults;
    counts.children = Math.min(counts.children, limits.max_guests - counts.adults);
  }
  return counts;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "2 guests, 1 infant, 2 pets" (capture A5: "16 guests, 5 infants"); null when nobody is chosen. */
export function guestSummary(counts: GuestCounts): string | null {
  const parts: string[] = [];
  const guests = countedGuests(counts);
  if (guests > 0) parts.push(plural(guests, "guest", "guests"));
  if (counts.infants > 0) parts.push(plural(counts.infants, "infant", "infants"));
  if (counts.pets > 0) parts.push(plural(counts.pets, "pet", "pets"));
  return parts.length > 0 ? parts.join(", ") : null;
}
