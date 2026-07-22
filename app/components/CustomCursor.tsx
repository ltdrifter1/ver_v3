'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Desktop custom cursor — balmingtiger pattern (PNG/SVG follow, click state).
 * Hidden on coarse pointers / touch.
 */
export default function CustomCursor({ enabled }: { enabled: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    setOk(fine && enabled);
  }, [enabled]);

  useEffect(() => {
    if (!ok) return;
    document.documentElement.classList.add('has-custom-cursor');

    const move = (e: PointerEvent) => {
      const node = el.current;
      if (!node) return;
      node.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };
    const down = () => setClicking(true);
    const up = () => setClicking(false);
    const over = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const hit = t.closest('button, a, [data-cursor="click"], .top-nav-item, .panel-close');
      setHovering(!!hit);
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('mouseover', over);
    return () => {
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
      <img src={src} alt="" width={32} height={32} draggable={false} />
    </div>
  );
}
