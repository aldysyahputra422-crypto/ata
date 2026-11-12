import { CalendarClock, FlaskRound } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { categoryMeta, TONE_TINT } from "@/lib/categories";
import { CategoryChip } from "./GemChip";
import { Tilt } from "./Tilt";

export type PosterCardProps = {
  title: string;
  organizer: string;
  category: string;
  /** e.g. "12 hari lagi" */
  deadlineLabel: string;
  /** source account username, shown as initial + credited in the label */
  source: string;
  imageUrl?: string | null;
  /** competitions.tint_hex; falls back to the category tone */
  tint?: string | null;
  demo?: boolean;
  /** up to two score reasons ("Kenapa cocok") */
  reasons?: string[];
  href?: string;
};

/** Radar poster (ref 1): portrait card whose drop shadow is tinted by the poster. No blur, ever. */
export function PosterCard(p: PosterCardProps) {
  const meta = categoryMeta(p.category);
  const tint = p.tint || TONE_TINT[meta.tone];
  const whyId = useId();
  const reasons = (p.reasons ?? []).slice(0, 2);

  const body = (
    <>
      <div className="poster-card__head">
        <CategoryChip category={p.category} size="sm" />
        <h3 className="poster-card__title">{p.title}</h3>
        <p className="poster-card__org">{p.organizer}</p>
      </div>
      <div className="poster-card__media">
        {p.imageUrl ? (
          // Posters live in Supabase Storage for <= 7 days (PRD 5.7.8); next/image caching would outlive that.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <div
            className="poster-card__fallback"
            style={
              {
                "--top": `var(--gem-${meta.tone}-top)`,
                "--bot": `var(--gem-${meta.tone}-bot)`,
                "--ink": `var(--gem-${meta.tone}-ink)`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            {p.title}
          </div>
        )}
        {p.demo ? (
          <span className="badge badge--solid poster-card__flag" data-status="warn">
            <FlaskRound aria-hidden="true" />
            DATA DEMO
          </span>
        ) : null}
        {reasons.length ? (
          <div className="poster-card__why" id={whyId}>
            <strong>Kenapa cocok</strong>
            {reasons.map((r) => (
              <span key={r}>{r}</span>
            ))}
          </div>
        ) : null}
        <div className="poster-card__foot">
          <span className="poster-card__avatar" title={`Sumber: @${p.source}`}>
            <span aria-hidden="true">{p.source.slice(0, 1).toUpperCase()}</span>
            <span className="sr-only">Sumber: @{p.source}</span>
          </span>
          <span className="badge badge--solid">
            <CalendarClock aria-hidden="true" />
            {p.deadlineLabel}
          </span>
        </div>
      </div>
    </>
  );

  const shared = {
    className: "poster-card",
    style: { "--tint": tint } as React.CSSProperties,
    "aria-describedby": reasons.length ? whyId : undefined,
  };

  return (
    <Tilt>
      {p.href ? (
        <Link href={p.href} {...shared}>
          {body}
        </Link>
      ) : (
        <article {...shared}>{body}</article>
      )}
    </Tilt>
  );
}

/** Same footprint as a poster so the rail does not jump when Radar is empty. */
export function PosterCardEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="poster-card poster-card--empty">
      <p className="font-display" style={{ fontWeight: 700, fontSize: "1.125rem", lineHeight: 1.25 }}>
        {title}
      </p>
      <p className="t-small t-muted">{text}</p>
    </div>
  );
}

export function PosterRail({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="poster-rail" role="group" aria-label={label}>
      {children}
    </div>
  );
}
