"use client";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";

/** Bottom sheet under 768 px, centred dialog above. Focus is trapped and restored; Esc closes. */
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content
        className={cn("sheet glass-frost grain", className)}
        data-specular
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <div className="sheet__grip" aria-hidden="true" />
        <Dialog.Title className="sheet__title">{title}</Dialog.Title>
        {description ? <Dialog.Description className="sheet__desc">{description}</Dialog.Description> : null}
        {children}
        <Dialog.Close className="icon-btn sheet__close" aria-label="Tutup">
          <X aria-hidden="true" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
