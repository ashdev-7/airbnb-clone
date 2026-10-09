import { ImageWithFallback } from "./image-with-fallback";

type Props = { name: string; avatarUrl: string | null; size?: number };

/**
 * A round portrait. An account without a picture shows its initial, dark pink on a pale
 * pink disc, as capture G1 does; seeded accounts have no picture (plan §19).
 */
export function Avatar({ name, avatarUrl, size = 40 }: Props) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar font-medium text-avatar-ink"
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
