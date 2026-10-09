/** Which page numbers the pagination control shows. */

export type PageItem = number | "gap";

const SHOW_ALL_UP_TO = 7;
const EDGE_RUN = 4;

function run(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/**
 * Capture B2 shows page 1 of 15 as "1 2 3 4 … 15". The other positions follow the same
 * idea: the first and last page are always there, with the pages around the current one.
 */
export function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= SHOW_ALL_UP_TO) return run(1, totalPages);
  if (page < EDGE_RUN) return [...run(1, EDGE_RUN), "gap", totalPages];
  if (page > totalPages - EDGE_RUN + 1) {
    return [1, "gap", ...run(totalPages - EDGE_RUN + 1, totalPages)];
  }
  return [1, "gap", page - 1, page, page + 1, "gap", totalPages];
}
