"use client";

import { Modal } from "@/components/ui/modal";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/** Values: REF-I3. The site has one language and one currency, so this only shows them. */
const SETTINGS = [
  { label: "Language and region", value: "English (IN)" },
  { label: "Currency", value: "₹ INR" },
];

/** "Languages & currency" (REF-I1). The panel is ours (plan §6.2). */
export function LanguageModal({ open, onOpenChange }: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Languages & currency">
      <dl className="flex flex-col gap-3 pt-2">
        {SETTINGS.map(({ label, value }) => (
          <div key={label} className="rounded-control border border-ink px-4 py-3">
            <dt className="text-xs leading-4 text-muted">{label}</dt>
            <dd className="text-base leading-5 font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
