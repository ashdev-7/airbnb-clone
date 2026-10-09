"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useCloseWhenHidden } from "./use-close-when-hidden";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Read by screen readers; shown in the header bar unless `titleHidden`. */
  title: string;
  titleHidden?: boolean;
  description?: string;
  children: ReactNode;
};

/**
 * The modal shell of capture A7: 480 px wide, 32 px corners, a 64 px header with the
 * close button on the right. Radix supplies the focus trap, Escape and the scroll lock.
 */
export function Modal({ open, onOpenChange, title, titleHidden, description, children }: Props) {
  useCloseWhenHidden(() => onOpenChange(false));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[2000] bg-scrim" />
        <Dialog.Content
          // Radix asks for an explicit "no description" when there is none.
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed top-1/2 left-1/2 z-[2001] flex max-h-[calc(100vh-40px)] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-modal bg-white shadow-raised focus:outline-none"
        >
          <header className="flex h-16 shrink-0 items-center justify-between px-6">
            <span className="w-8" />
            <Dialog.Title className={titleHidden ? "sr-only" : "text-base font-semibold"}>
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 flex size-8 items-center justify-center rounded-full hover:bg-control"
            >
              <X size={16} strokeWidth={2.5} aria-hidden />
            </Dialog.Close>
          </header>
          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : null}
          <div className="overflow-y-auto px-6 pb-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
