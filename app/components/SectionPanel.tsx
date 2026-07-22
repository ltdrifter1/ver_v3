'use client';

import { useEffect, useRef, useState } from 'react';
import { SECTION_BY_ID } from '@/app/data/sections';

/**
 * Floating overlay panel — closer to balmingtiger menu-panels than a side drawer:
 * centred card, soft scrim, horizontal item strip.
 */
export default function SectionPanel({
  activeId,
  onClose,
}: {
  activeId: string | null;
  onClose: () => void;
}) {
  const [shownId, setShownId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);

    if (activeId) {
      setShownId(activeId);
      const raf = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(raf);
    }

    setOpen(false);
    closeTimer.current = setTimeout(() => setShownId(null), 500);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, onClose]);

  const section = shownId ? SECTION_BY_ID[shownId] : null;

  return (
    <div
      className={`panel-root ${open ? 'open' : ''}`}
      style={{ display: section ? 'flex' : 'none' }}
      aria-hidden={!open}
    >
      <div className="panel-scrim" onPointerDown={onClose} />
      <aside
        className="panel"
        style={
          section
            ? ({ ['--panel-accent' as string]: section.accent } as React.CSSProperties)
            : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-label={section?.title}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          className="panel-close"
          onClick={onClose}
          aria-label="Close"
          data-cursor="click"
        >
          ×
        </button>
        {section && (
          <>
            <p className="panel-kicker">{section.kicker}</p>
            <h2 className="panel-title">{section.title}</h2>
            <p className="panel-intro">{section.intro}</p>
            <ul className="panel-list">
              {section.items.map((it, i) => (
                <li
                  className="panel-item"
                  key={i}
                  style={{ transitionDelay: `${0.12 + i * 0.04}s` }}
                >
                  <span className="pi-label">{it.label}</span>
                  {it.meta && <span className="pi-meta">{it.meta}</span>}
                  {it.detail && <span className="pi-detail">{it.detail}</span>}
                </li>
              ))}
            </ul>
            <p className="panel-foot">
              {section.object} · {section.nav}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
