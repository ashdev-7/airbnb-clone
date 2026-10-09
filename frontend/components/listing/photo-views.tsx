"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useStay } from "@/hooks/use-stay";

type Props = { listingId: number; photos: string[]; name: string };

const ROUND = "flex size-10 items-center justify-center rounded-full";

/**
 * The two full-screen photo views of a listing (R-LD-1). Which one is open is part of the
 * URL (`modal=photos`, `modal=photo&photo=3`), so Back closes them and a link can open
 * straight on a photo.
 *
 * The photo tour follows capture C5: a white page with a back arrow, the photos in a
 * column 741 px wide, one full width and then two side by side. The original groups them
 * by room; our photos carry no room names. No capture shows the single-photo view; it is
 * built from the same parts, and listed as pending.
 */
export function PhotoViews({ listingId, photos, name }: Props) {
  const { stay, setStay, openModal, closeModal } = useStay(listingId);
  const tourOpen = stay.modal === "photos";
  const photoOpen = stay.modal === "photo";
  const index = Math.min(stay.photo, photos.length - 1);

  // The arrow keys step through the photos; Radix handles Escape.
  useEffect(() => {
    if (!photoOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && index < photos.length - 1) setStay({ photo: index + 1 });
      if (event.key === "ArrowLeft" && index > 0) setStay({ photo: index - 1 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoOpen, index, photos.length, setStay]);

  return (
    <>
      <Dialog.Root open={tourOpen} onOpenChange={(open) => !open && closeModal()}>
        <Dialog.Portal>
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-[1500] overflow-y-auto bg-white focus:outline-none"
          >
            <div className="sticky top-0 z-[1] flex h-16 items-center bg-white px-6">
              <Dialog.Close aria-label="Close the photo tour" className={`${ROUND} hover:bg-control`}>
                <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
              </Dialog.Close>
            </div>
            <div className="mx-auto w-[1120px] max-w-[calc(100vw-48px)] pb-16">
              <Dialog.Title className="pb-8 text-[26px] leading-[30px] font-medium">Photo tour</Dialog.Title>
              <ul className="mx-auto grid max-w-[741px] grid-cols-2 gap-2">
                {photos.map((photo, position) => (
                  <li key={photo} className={position % 3 === 0 ? "col-span-2" : ""}>
                    <button
                      type="button"
                      aria-label={`Open photo ${position + 1} of ${photos.length}`}
                      onClick={() => openModal("photo", position)}
                      className="relative block aspect-[3/2] w-full bg-line"
                    >
                      <ImageWithFallback
                        src={photo}
                        alt={`${name}: photo ${position + 1}`}
                        sizes={position % 3 === 0 ? "741px" : "370px"}
                        eager={position === 0}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={photoOpen} onOpenChange={(open) => !open && closeModal("photos")}>
        <Dialog.Portal>
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-[1600] flex flex-col bg-black text-white focus:outline-none"
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-6">
              <Dialog.Close className="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-white/10">
                <X size={16} strokeWidth={2.5} aria-hidden />
                Close
              </Dialog.Close>
              <Dialog.Title className="text-base font-medium" aria-live="polite">
                {index + 1} / {photos.length}
              </Dialog.Title>
              <span className="w-[72px]" />
            </div>
            <div className="flex min-h-0 flex-1 items-center gap-4 px-6 pb-10">
              <button
                type="button"
                aria-label="Previous photo"
                disabled={index === 0}
                onClick={() => setStay({ photo: index - 1 })}
                className={`${ROUND} shrink-0 border border-white/60 hover:bg-white/10 disabled:invisible`}
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <div className="relative h-full flex-1">
                {photos[index] && (
                  <ImageWithFallback
                    key={photos[index]}
                    src={photos[index]}
                    alt={`${name}: photo ${index + 1}`}
                    sizes="100vw"
                    eager
                    className="!object-contain"
                  />
                )}
              </div>
              <button
                type="button"
                aria-label="Next photo"
                disabled={index >= photos.length - 1}
                onClick={() => setStay({ photo: index + 1 })}
                className={`${ROUND} shrink-0 border border-white/60 hover:bg-white/10 disabled:invisible`}
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
