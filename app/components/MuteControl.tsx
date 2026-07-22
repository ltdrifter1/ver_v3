'use client';

import { useCallback, useEffect, useState } from 'react';
import { isMuted, setMuted, unlockAudio } from '@/lib/audio';

/**
 * balmingtiger mute toggle — bottom-right (mobile top-right).
 * Fades out during Videos focus instead of unmounting.
 */
export default function MuteControl({
  visible,
  unlocked,
  faded = false,
}: {
  visible: boolean;
  /** True after gate enter — audio may unlock on unmute. */
  unlocked: boolean;
  /** Hide during CRT video focus (0.3s opacity tween). */
  faded?: boolean;
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
      className={`mute-control${faded ? ' is-faded' : ''}`}
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={muted ? 'Unmute' : 'Mute'}
      title={muted ? 'Unmute' : 'Mute'}
      data-cursor="click"
      tabIndex={faded ? -1 : 0}
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
