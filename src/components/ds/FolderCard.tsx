import { Plus } from "lucide-react";
import Link from "next/link";
import type { GemTone } from "@/lib/categories";
import { Stamp, Sticker } from "./Sticker";

const FOLDER_PATH =
  "M0 13Q0 1 12 1L60 1C70 1 70 13 82 13L162 13Q174 13 174 25L174 88Q174 100 162 100L12 100Q0 100 0 88Z";

export type FolderPeek = { src?: string; tone?: GemTone };

export type FolderCardProps = {
  name: string;
  /** pill under the name, e.g. "7 dari 18 tugas" */
  countLabel: string;
  category: string;
  daysLeft?: number;
  /** up to 3 thumbnails peeking out (tasks done this week, max 3) */
  peeks?: FolderPeek[];
  href?: string;
};

function Wrapper({ href, label, children }: { href?: string; label?: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className="folder-card" aria-label={label}>
      {children}
    </Link>
  ) : (
    <div className="folder-card" tabIndex={0} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/** Frosted folder with stickers (ref 2). Used for Slots, Karya, Tersimpan, Racikan. */
export function FolderCard({ name, countLabel, category, daysLeft, peeks = [], href }: FolderCardProps) {
  return (
    <Wrapper href={href}>
      <div className="folder">
        <span className="folder__shadow" aria-hidden="true" />
        <span className="folder__back" aria-hidden="true" />
        {peeks.slice(0, 3).map((peek, i) => (
          <span
            key={i}
            className="folder__peek"
            data-slot={i}
            aria-hidden="true"
            style={
              peek.src
                ? { backgroundImage: `url(${JSON.stringify(peek.src)})` }
                : { background: `linear-gradient(160deg, var(--gem-${peek.tone ?? "lavender"}-top), var(--gem-${peek.tone ?? "lavender"}-bot))` }
            }
          />
        ))}
        <div className="folder__front glass-frost" data-specular>
          <Sticker category={category} />
          {typeof daysLeft === "number" ? <Stamp daysLeft={daysLeft} /> : null}
        </div>
        <svg className="folder__edge" viewBox="0 0 174 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOLDER_PATH} />
          <line x1="8" y1="92" x2="166" y2="92" />
        </svg>
      </div>
      <div className="folder__meta">
        <span className="folder__name">{name}</span>
        <span className="folder__count">{countLabel}</span>
      </div>
    </Wrapper>
  );
}

/** Empty slot: dashed outline, never a sad state. */
export function FolderCardEmpty({ label = "Slot kosong", hint, href }: { label?: string; hint?: string; href?: string }) {
  return (
    <Wrapper href={href} label={hint ? `${label}. ${hint}` : label}>
      <div className="folder folder--empty">
        <div className="folder__front">
          <Plus aria-hidden="true" />
          <span>{label}</span>
        </div>
      </div>
      <div className="folder__meta">
        <span className="folder__name t-muted">{hint ?? "Pilih satu lomba"}</span>
        <span className="folder__count">0 tugas</span>
      </div>
    </Wrapper>
  );
}
