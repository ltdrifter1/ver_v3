'use client';

import { SECTIONS } from '@/app/data/sections';

/** Primary nav — balmingtiger-style floating white labels across the top. */
const NAV_ORDER = [
  'listening-booth',
  'crt-tv',
  'record-bins',
  'cash-register',
  'flyer-wall',
  'phone-booth',
] as const;

export default function TopNav({
  visible,
  activeId,
  onOpen,
}: {
  visible: boolean;
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  if (!visible) return null;

  const items = NAV_ORDER.map((id) => SECTIONS.find((s) => s.id === id)!).filter(Boolean);

  return (
    <nav className="top-nav" aria-label="Store sections">
      {items.map((s) => {
        const open = activeId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            className={`top-nav-item${open ? ' is-open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(s.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="top-nav-label">{s.nav.toUpperCase()}</span>
            <span className="top-nav-line" aria-hidden />
            {open && <span className="top-nav-close">×</span>}
          </button>
        );
      })}
    </nav>
  );
}
