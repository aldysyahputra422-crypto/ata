"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bacaAkun } from "../../_layar/akun";
import { lingkupKini, pakaiLingkup } from "../../_layar/lingkup";
import { bacaHariIni, bacaHariIniAkun, dengar, dengarHari, type DataHariIni, type Paket } from "./data";

export type Muatan = { status: "memuat" } | { status: "galat" } | { status: "siap"; data: DataHariIni };
export type Sumber = "memeriksa" | "lokal" | "akun" | "terputus";

/**
 * Slot, task and XP data for the tab screens. Signed in, it is the account's (/api/v1/progress); signed out, the
 * device's. Whose data it is comes from /api/v1/me only; the limit and name come from there too.
 */
export function useDataHari() {
  const [muatan, setMuatan] = useState<Muatan>({ status: "memuat" });
  const [akun, setAkun] = useState<{ batas?: number; nama?: string; paket?: Paket }>({});
  const [sumber, setSumber] = useState<Sumber>("memeriksa");
  const urutan = useRef(0);

  const batas = akun.batas;
  const paket = akun.paket;
  const muat = useCallback(() => {
    if (sumber === "memeriksa") return;
    if (sumber === "terputus") return setMuatan({ status: "galat" });
    if (sumber === "akun") {
      // only the latest request may set the screen: an older, slower answer is dropped
      const giliran = ++urutan.current;
      void bacaHariIniAkun().then((data) => {
        if (giliran === urutan.current) setMuatan(data ? { status: "siap", data } : { status: "galat" });
      });
      return;
    }
    try {
      setMuatan({ status: "siap", data: bacaHariIni(batas, paket) });
    } catch {
      setMuatan({ status: "galat" });
    }
  }, [sumber, batas, paket]);

  useEffect(() => {
    muat();
    const lepas = [dengar(muat), dengarHari(muat)];
    return () => lepas.forEach((f) => f());
  }, [muat]);

  // A failed call shows device data only when the stores hold device data; an account's copy on the device is never
  // shown as the account's truth.
  useEffect(() => {
    void bacaAkun().then((r) => {
      if (!r.ok) return setSumber(lingkupKini() === "lokal" ? "lokal" : "terputus");
      const { plan, slot_limits, user } = r.data;
      const masuk = r.data.signed_in && !!user;
      // device data is set aside before an account's data is shown, and brought back after signing out
      if (pakaiLingkup(masuk && user ? user.id : null) === "ganti") return window.location.reload();
      setSumber(masuk ? "akun" : "lokal");
      setAkun({
        batas: plan.features.activeSlots?.limit ?? slot_limits[plan.plan === "pro" ? "pro" : "free"],
        nama: user?.display_name?.trim().split(/\s+/)[0] || undefined,
        paket: plan.plan === "pro" ? "pro" : "gratis",
      });
    });
  }, []);

  return { muatan, sumber, akun, muat };
}
