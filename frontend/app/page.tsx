import { SITE_NAME } from "@/lib/config";

// Phase 1 placeholder. The explore view (plan §6.3) replaces it in Phase 5.
export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-semibold">{SITE_NAME}</h1>
    </main>
  );
}
