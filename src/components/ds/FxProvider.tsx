"use client";
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { fxStore, type FxState } from "@/lib/fx/store";

/** Mount once in the root layout. Owns <html data-theme|data-glass|data-fx|data-refract|data-page-hidden>. */
export function FxProvider({ children }: { children: React.ReactNode }) {
  useEffect(
    () =>
      fxStore.init({
        onDegrade: () =>
          toast("Efek diturunkan agar tetap mulus.", { description: "Ubah di Pengaturan → Efek." }),
      }),
    [],
  );
  return <>{children}</>;
}

export function useFx(): FxState {
  return useSyncExternalStore(fxStore.subscribe, fxStore.get, fxStore.getServer);
}
