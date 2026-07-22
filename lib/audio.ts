/**
 * Audio bus — BGM loop + object SFX + balmingtiger-style volume tweens.
 */
import gsap from 'gsap';

let bgm: HTMLAudioElement | null = null;
let muted = true;
let duckTween: gsap.core.Tween | null = null;
const volume = { bgm: 0.45, sfx: 0.55, target: 0.45 };

const SFX: Record<string, string> = {
  click: '/audio/click.mp3',
  focus: '/audio/focus.mp3',
  music: '/audio/music.mp3',
  video: '/audio/video.mp3',
  phone: '/audio/phone.mp3',
  lights: '/audio/lights.mp3',
  shop: '/audio/shop.mp3',
  archive: '/audio/archive.mp3',
  artists: '/audio/artists.mp3',
  door: '/audio/door.mp3',
};

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

export async function unlockAudio() {
  const a = ensureBgm();
  if (!a) return;
  try {
    if (!muted) {
      a.volume = volume.target;
      await a.play();
    }
  } catch {
    /* unmute will retry */
  }
}

export async function setMuted(next: boolean) {
  muted = next;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('is-muted', muted);
  }
  const a = ensureBgm();
  if (!a) return;
  duckTween?.kill();
  if (muted) {
    a.volume = 0;
    a.pause();
  } else {
    volume.target = volume.bgm;
    a.volume = volume.bgm;
    try {
      await a.play();
    } catch {
      /* ignore */
    }
  }
}

export function playSfx(name: keyof typeof SFX | string) {
  if (muted || typeof window === 'undefined') return;
  const src = SFX[name] ?? SFX.focus;
  const s = new Audio(src);
  s.volume = volume.sfx;
  void s.play().catch(() => {});
}

/**
 * balmingtiger muteBGMVolume / unmuteBGMVolume — 0.6s power1.inOut tween.
 * ducked=true → near silence; false → restore target level.
 */
export function setBgmDucked(ducked: boolean, duration = 0.6) {
  const a = ensureBgm();
  if (!a || muted) return;
  duckTween?.kill();
  const to = ducked ? 0.02 : volume.bgm;
  volume.target = to;
  const proxy = { v: a.volume };
  duckTween = gsap.to(proxy, {
    v: to,
    duration,
    ease: 'power1.inOut',
    onUpdate: () => {
      if (!muted && a) a.volume = proxy.v;
    },
  });
}
