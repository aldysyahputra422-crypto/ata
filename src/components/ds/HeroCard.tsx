/** Gradient hero with a frosted window (ref 3). Layers follow the pointer on desktop (E4). */
export function HeroCard({ window: win, children }: { window: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="hero-card" data-parallax>
      <div className="hero-card__stage">
        <div className="hero-card__blob layer" data-depth="back" aria-hidden="true" />
        <div className="hero-card__window layer grain" data-depth="mid">
          <div className="hero-card__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          {win}
        </div>
      </div>
      <div className="hero-card__body">{children}</div>
    </section>
  );
}
