import { categoryMeta } from "@/lib/categories";
import { categoryIcon } from "./category-icons";

/** Die-cut category sticker. Decorative: the category is always also given in text nearby. */
export function Sticker({ category, rotate = -6 }: { category: string; rotate?: number }) {
  const meta = categoryMeta(category);
  return (
    <span className="sticker" data-tone={meta.tone} style={{ "--rot": `${rotate}deg` } as React.CSSProperties} aria-hidden="true">
      {categoryIcon(meta.code)}
    </span>
  );
}

/** Postage stamp showing days left ("H-12"). */
export function Stamp({ daysLeft }: { daysLeft: number }) {
  const d = Math.max(0, Math.round(daysLeft));
  const text = d === 0 ? "Hari ini" : `H-${d}`;
  return (
    <span className="stamp tabular" data-urgency={d <= 3 ? "soon" : "normal"}>
      <span>
        <span className="sr-only">Sisa waktu: </span>
        {text}
      </span>
    </span>
  );
}
