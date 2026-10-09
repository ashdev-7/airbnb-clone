/** A grey block that stands in for content while it loads (plan §6.13). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-line-soft ${className}`} />;
}
