"use client";

import { Copy, Heart, Share } from "lucide-react";
import { useState } from "react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useWishlist } from "@/hooks/use-wishlist";

type Props = {
  listingId: number;
  title: string;
  /** One line that describes the place in the share modal (capture C10). */
  summary: string;
  cover: string | undefined;
};

const ACTION =
  "inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm leading-[18px] font-medium underline hover:bg-surface";

/**
 * The title of a listing with "Share" and "Save" at its right (capture C1): a 26 px
 * medium heading; two underlined 14 px actions with 16 px icons.
 */
export function TitleBar({ listingId, title, summary, cover }: Props) {
  const { isSaved, toggle } = useWishlist();
  const toast = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const saved = isSaved(listingId);

  async function copyLink() {
    // The address of the listing alone: a shared link should not carry our dates.
    const link = `${window.location.origin}/rooms/${listingId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.show("Link copied");
      setShareOpen(false);
    } catch {
      toast.show("Something went wrong, try again.");
    }
  }

  return (
    <div className="flex items-start justify-between gap-6 pt-6 pb-6 max-md:flex-col max-md:gap-3">
      <h1 className="text-[26px] leading-[30px] font-medium">{title}</h1>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <button type="button" onClick={() => setShareOpen(true)} className={ACTION}>
          <Share size={16} aria-hidden />
          Share
        </button>
        <button type="button" aria-pressed={saved} onClick={() => toggle(listingId)} className={ACTION}>
          <Heart
            size={16}
            aria-hidden
            fill={saved ? "var(--color-brand)" : "none"}
            stroke={saved ? "var(--color-brand)" : "currentColor"}
          />
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {/* Capture C10. Only "Copy Link" is offered: the other targets are not built (plan §6.6). */}
      <Modal open={shareOpen} onOpenChange={setShareOpen} title="Share this place" titleHidden size="lg">
        <h2 className="text-[26px] leading-[30px] font-medium">Share this place</h2>
        <div className="flex items-center gap-4 py-6">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-line">
            {cover && <ImageWithFallback src={cover} alt="" sizes="64px" />}
          </span>
          <p className="text-base leading-5">{summary}</p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="flex h-[50px] w-[252px] max-w-full items-center gap-4 rounded-control border border-line px-4 text-base font-medium hover:bg-surface"
        >
          <Copy size={20} aria-hidden />
          Copy Link
        </button>
      </Modal>
    </div>
  );
}
