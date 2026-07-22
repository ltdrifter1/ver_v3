'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * balmingtiger mute toggle — bottom-left. Audio is opt-in placeholder:
 * we only flip UI state + a CSS class so a real BGM loop can plug in later.
 */
export default function MuteControl({ visible }: { visible: boolean }) {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('is-muted', muted);
  }, [muted]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((m) => !m);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="mute-control"
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={muted ? 'Unmute' : 'Mute'}
      title={muted ? 'Unmute' : 'Mute'}
      data-cursor="click"
    >
      <img
        src={muted ? '/cursors/mute.svg' : '/cursors/unmute.svg'}
        alt=""
        width={28}
        height={28}
        draggable={false}
      />
    </button>
  );
}
