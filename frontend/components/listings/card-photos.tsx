"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

const MAX_DOTS = 5;
/** How wide a card is drawn, so the browser asks for a fitting file. */
const SIZES = {
  home: "(min-width: 1200px) 16vw, (min-width: 700px) 25vw, 50vw",
  results: "(min-width: 1200px) 25vw, (min-width: 640px) 50vw, 100vw",
};

/** The photos of a card, side by side; the track slides to the one at `index`. */
export function CardPhotoTrack({
  photos,
  index,
  alt,
  eager,
  size,
}: {
  photos: string[];
  index: number;
  alt: string;
  eager: boolean;
  size: keyof typeof SIZES;
}) {
  return (
    <div
      className="flex h-full transition-transform duration-300"
      style={{ transform: `translateX(-${index * 100}%)` }}
    >
      {photos.map((photo, position) => (
        <div key={photo} className="relative h-full w-full shrink-0">
          {/* Only the photo on show and its neighbours are requested. */}
          {Math.abs(position - index) <= 1 && (
            <ImageWithFallback
              src={photo}
              alt={position === 0 ? alt : ""}
              sizes={SIZES[size]}
              eager={eager && position === 0}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const ARROW =
  "pointer-events-auto flex size-8 items-center justify-center rounded-full border border-black/8 bg-white/90 opacity-0 shadow-control transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-paper";

/**
 * The photo controls of captures B1 and B3: arrows that appear on hover, 12 px in from
 * the sides, and a row of dots along the bottom. Labels as on the original.
 */
export function CardPhotoControls({
  count,
  index,
  onChange,
  name,
}: {
  count: number;
  index: number;
  onChange: (index: number) => void;
  name: string;
}) {
  if (count <= 1) return null;

  // At most five dots; the window follows the photo on show.
  const first = Math.min(Math.max(index - 2, 0), Math.max(count - MAX_DOTS, 0));
  const dots = Array.from({ length: Math.min(count, MAX_DOTS) }, (_, offset) => first + offset);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
        <button
          type="button"
          aria-label={`Previous photo: ${name}`}
          disabled={index === 0}
          onClick={() => onChange(index - 1)}
          className={`${ARROW} disabled:invisible`}
        >
          <ChevronLeft size={12} strokeWidth={4} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Next photo: ${name}`}
          disabled={index === count - 1}
          onClick={() => onChange(index + 1)}
          className={`${ARROW} disabled:invisible`}
        >
          <ChevronRight size={12} strokeWidth={4} aria-hidden />
        </button>
      </div>
      <div
        role="img"
        aria-label={`Photo ${index + 1} of ${count}`}
        className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-[5px]"
      >
        {dots.map((dot) => (
          <span
            key={dot}
            className={`size-1.5 rounded-full ${dot === index ? "bg-paper" : "bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}
