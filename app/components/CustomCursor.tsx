'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Desktop custom cursor — balmingtiger pattern:
 * PNG/SVG follow + horizontal tilt (mouseX → ±70°) + click state.
 */
export default function CustomCursor({ enabled }: { enabled: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [ok, setOk] = useState(false);
  const pos = useRef({ x: -100, y: -100, rot: 0, tx: -100, ty: -100, tr: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    setOk(fine && enabled);
  }, [enabled]);

  useEffect(() => {
    if (!ok) return;
    document.documentElement.classList.add('has-custom-cursor');

    const ease = 0.28;

    const tick = () => {
      const p = pos.current;
      p.x += (p.tx - p.x) * ease;
      p.y += (p.ty - p.y) * ease;
      p.rot += (p.tr - p.rot) * ease;
      const node = el.current;
      if (node) {
        node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-12px, -2px) rotateZ(${p.rot * 70}deg)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    const move = (e: PointerEvent) => {
      pos.current.tx = e.clientX;
      pos.current.ty = e.clientY;
      pos.current.tr = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    };
    const down = () => setClicking(true);
    const up = () => setClicking(false);
    const over = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const hit = t.closest(
        'button, a, [data-cursor="click"], .top-nav-hit, .panel-back, .panel-row',
      );
      setHovering(!!hit);
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('mouseover', over);
    return () => {
      cancelAnimationFrame(raf.current);
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('mouseover', over);
    };
  }, [ok]);

  if (!ok) return null;

  const src = clicking || hovering ? '/cursors/click.svg' : '/cursors/default.svg';

  return (
    <div className={`custom-cursor${clicking ? ' is-down' : ''}`} ref={el} aria-hidden>
      <img src={src} alt="" width={40} height={40} draggable={false} />
    </div>
  );
}
