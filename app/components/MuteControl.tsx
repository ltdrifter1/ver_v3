'use client';

import { useCallback, useEffect, useState } from 'react';
import { isMuted, setMuted, unlockAudio } from '@/lib/audio';

/**
 * balmingtiger mute toggle — bottom-left. Controls real BGM loop.
 */
export default function MuteControl({
  visible,
  unlocked,
}: {
  visible: boolean;
  /** True after gate enter — audio may unlock on unmute. */
  unlocked: boolean;
}) {
  const [muted, setMutedState] = useState(true);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  useEffect(() => {
    if (unlocked && !muted) {
      void unlockAudio();
    }
  }, [unlocked, muted]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !muted;
    setMutedState(next);
    await setMuted(next);
  }, [muted]);

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
