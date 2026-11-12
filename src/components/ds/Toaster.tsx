"use client";
import { Toaster as Sonner } from "sonner";

/** Glass toast: above the tab bar on mobile, bottom-right on desktop, 4 s, dismissible. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      closeButton
      mobileOffset={{ bottom: 96 }}
      toastOptions={{ unstyled: true, classNames: { toast: "toast glass-thin" } }}
    />
  );
}
