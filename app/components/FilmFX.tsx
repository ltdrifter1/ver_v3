'use client';

/**
 * Light cartoon grade — flat, bright, clean like balmingtiger.
 * No heavy film grain / scanlines / tungsten wash that fought the illustration.
 */
export default function FilmFX() {
  return (
    <div className="fx-layer" aria-hidden>
      <div className="fx-cel" />
      <div className="fx-vignette" />
    </div>
  );
}
