'use client';

/** Fullscreen filmic treatment: tungsten warmth, vignette, grain and scanlines. */
export default function FilmFX() {
  return (
    <div className="fx-layer" aria-hidden>
      <div className="fx-warm" />
      <div className="fx-vignette" />
      <div className="fx-scan" />
      <div className="fx-grain" />
    </div>
  );
}
