import { ImageWithFallback } from "./image-with-fallback";

type Props = { name: string; avatarUrl: string | null; size?: number };

/**
 * A round portrait (capture E1). Seeded accounts have no picture yet (plan §19), so the
 * usual sight is the initial on a dark disc, which is ours.
 */
export function Avatar({ name, avatarUrl, size = 40 }: Props) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink font-medium text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {avatarUrl ? (
        <ImageWithFallback src={avatarUrl} alt="" sizes={`${size}px`} />
      ) : (
        <span aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
