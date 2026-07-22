/**
 * Lightweight audio bus — BGM loop + one-shot SFX.
 * Mirrors balmingtiger mute / focus click sounds with original placeholders.
 */

let bgm: HTMLAudioElement | null = null;
let muted = true;
const volume = { bgm: 0.45, sfx: 0.55 };

function ensureBgm() {
  if (bgm) return bgm;
  if (typeof window === 'undefined') return null;
  bgm = new Audio('/audio/bgm.mp3');
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.volume = muted ? 0 : volume.bgm;
  return bgm;
}

export function isMuted() {
  return muted;
}

/** Call once after user gesture (enter / unmute). */
export async function unlockAudio() {
  const a = ensureBgm();
  if (!a) return;
  try {
    if (!muted) {
      a.volume = volume.bgm;
      await a.play();
    }
  } catch {
    /* autoplay still blocked — unmute click will retry */
  }
}

export async function setMuted(next: boolean) {
  muted = next;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('is-muted', muted);
  }
  const a = ensureBgm();
  if (!a) return;
  if (muted) {
    a.volume = 0;
    a.pause();
  } else {
    a.volume = volume.bgm;
    try {
      await a.play();
    } catch {
      /* ignore */
    }
  }
}

export function playSfx(name: 'click' | 'focus') {
  if (muted || typeof window === 'undefined') return;
  const src = name === 'click' ? '/audio/click.mp3' : '/audio/focus.mp3';
  const s = new Audio(src);
  s.volume = volume.sfx;
  void s.play().catch(() => {});
}

/** Dip BGM while video panel is focused (balmingtiger muteBGMVolume). */
export function setBgmDucked(ducked: boolean) {
  const a = ensureBgm();
  if (!a || muted) return;
  a.volume = ducked ? volume.bgm * 0.15 : volume.bgm;
}
