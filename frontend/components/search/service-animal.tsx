"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

/**
 * "Bringing a service animal?" under "Pets" (captures A5, C3): an underlined link that
 * opens a short explanation. The words are ours; the original links to its help pages.
 */
export function ServiceAnimalLink({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded text-left font-medium underline ${className}`}
      >
        Bringing a service animal?
      </button>
      <Modal open={open} onOpenChange={setOpen} title="Service animals">
        <div className="grid gap-4 pt-2 text-base leading-6">
          <p>
            A service animal is trained to help a person with a disability. It is not a pet, so you do not
            need to add it to the number of pets, and it does not need the host’s permission to come along.
          </p>
          <p>
            It helps to tell your host in advance that you are travelling with one, so that the place is
            ready for you both.
          </p>
          <p className="text-sm leading-[18px] text-muted">
            Animals that give comfort or company, but are not trained for a task, count as pets.
          </p>
        </div>
      </Modal>
    </>
  );
}
