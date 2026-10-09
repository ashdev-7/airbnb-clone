"use client";

import { Grip } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useStay } from "@/hooks/use-stay";

type Props = { listingId: number; photos: string[]; name: string };

/*
 * Capture C1: 1120 × 353, 8 px between tiles, the outer corners rounded: one large photo
 * on the left half and four small ones on the right. With fewer photos the grid keeps its
 * size and uses fewer tiles (two seeded listings have three photos, plan §12).
 */
const LAYOUTS: Record<number, string[]> = {
  1: ["col-span-4 row-span-2"],
  2: ["col-span-2 row-span-2", "col-span-2 row-span-2"],
  3: ["col-span-2 row-span-2", "col-span-2", "col-span-2"],
  4: ["col-span-2 row-span-2", "col-span-2", "", ""],
  5: ["col-span-2 row-span-2", "", "", "", ""],
};

/**
 * The photo gallery at the top of a listing (R-LD-1). Every tile, and "Show all photos",
 * opens the photo tour.
 */
export function Gallery({ listingId, photos, name }: Props) {
  const { openModal } = useStay(listingId);
  const tiles = photos.slice(0, 5);
  if (tiles.length === 0) {
    return <div className="flex h-[353px] items-center justify-center rounded-xl bg-control text-muted">No photos yet</div>;
  }
  const layout = LAYOUTS[tiles.length];

  return (
    <div id="photos" className="relative scroll-mt-24">
      <div className="grid h-[353px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl">
        {tiles.map((photo, index) => (
          <button
            key={photo}
            type="button"
            aria-label={`Photo ${index + 1} of ${photos.length}: open the photo tour`}
            onClick={() => openModal("photos")}
            className={`group relative bg-line ${layout[index]}`}
          >
            <ImageWithFallback
              src={photo}
              alt={index === 0 ? name : ""}
              sizes={index === 0 ? "(min-width: 1200px) 560px, 50vw" : "(min-width: 1200px) 280px, 25vw"}
              eager={index === 0}
            />
            <span aria-hidden className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => openModal("photos")}
        className="absolute right-6 bottom-6 inline-flex items-center gap-2 rounded-lg border border-ink bg-white px-3.5 py-2 text-xs leading-4 font-medium hover:bg-surface"
      >
        <Grip size={14} aria-hidden />
        Show all photos
      </button>
    </div>
  );
}
