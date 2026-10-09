"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  /** Tells the browser how wide the image is drawn, so it picks a fitting file. */
  sizes: string;
  /** For images on screen at first paint; the rest load as they come near. */
  eager?: boolean;
  className?: string;
};

/**
 * Fills its parent, which sets the size and shape. The parent's grey shows while the file
 * loads; if the address fails, a neutral tile takes its place (plan §6.13, §17 risk 3).
 */
export function ImageWithFallback({ src, alt, sizes, eager = false, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0 flex items-center justify-center bg-control text-faint"
      >
        <ImageOff size={32} aria-hidden />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
