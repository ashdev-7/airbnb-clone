"use client";

import * as RadixPopover from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { useCloseWhenHidden } from "./use-close-when-hidden";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The element that opens the panel; it must accept a ref (a button). */
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  /** Distance from the trigger, in px. Capture A6: the menu sits 17 px under its button. */
  offset?: number;
  className?: string;
};

/** A floating panel with the surface of the account menu in capture A6. */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "end",
  offset = 17,
  className = "",
}: Props) {
  useCloseWhenHidden(() => onOpenChange(false));

  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={offset}
          className={`z-[200] rounded-control bg-white shadow-menu focus:outline-none ${className}`}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
