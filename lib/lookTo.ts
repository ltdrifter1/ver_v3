import gsap from 'gsap';
import type { Controls } from '@/app/components/sceneContext';
import type { Section } from '@/app/data/sections';
import {
  MFOV_EXPLORE,
  START_LOOK_U,
  START_LOOK_V,
  uToYaw,
  vToPitch,
} from '@/lib/pano';

const TWO_PI = Math.PI * 2;

/** Shortest-path yaw delta into (−π, π]. */
function yawDelta(from: number, to: number) {
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

let activeTween: gsap.core.Tween | gsap.core.Timeline | null = null;

/**
 * balmingtiger `lookto(h,v,fov,tween(easeinoutquart,2))` equivalent.
 * Tweens look + MFOV toward a hotspot, locking drag while in flight.
 */
export function lookToSection(
  controls: Controls,
  section: Section,
  opts: { duration?: number; onComplete?: () => void } = {},
) {
  const duration = opts.duration ?? 2;
  const targetYaw = uToYaw(section.lookU ?? section.u);
  const targetPitch = vToPitch(section.lookV ?? section.v);
  const targetMfov = section.lookFov ?? 80;

  activeTween?.kill();
  controls.velocity.x = 0;
  controls.velocity.y = 0;
  controls.lookAnimating = true;
  controls.followFactor = 0;

  const startYaw = controls.lookTarget.x;
  const delta = yawDelta(startYaw, targetYaw);
  const proxy = {
    t: 0,
    pitch: controls.lookTarget.y,
    mfov: controls.mfov,
  };

  const tl = gsap.timeline({
    onComplete: () => {
      controls.lookTarget.x = targetYaw;
      controls.lookTarget.y = targetPitch;
      controls.mfov = targetMfov;
      controls.lookAnimating = false;
      opts.onComplete?.();
    },
  });

  tl.to(
    proxy,
    {
      t: 1,
      pitch: targetPitch,
      mfov: targetMfov,
      duration,
      // ≈ krpano / GSAP easeinoutquart
      ease: 'power4.inOut',
      onUpdate: () => {
        controls.lookTarget.x = startYaw + delta * proxy.t;
        controls.lookTarget.y = proxy.pitch;
        controls.mfov = proxy.mfov;
      },
    },
    0,
  );

  activeTween = tl;
  return tl;
}

/** Restore explore FOV after closing a panel (keep current look). */
export function restoreExploreFov(controls: Controls, duration = 1.2) {
  activeTween?.kill();
  controls.lookAnimating = true;
  controls.velocity.x = 0;
  controls.velocity.y = 0;
  const tw = gsap.to(controls, {
    mfov: MFOV_EXPLORE,
    duration,
    ease: 'power4.inOut',
    onComplete: () => {
      controls.lookAnimating = false;
    },
  });
  activeTween = tw;
  return tw;
}

/** Full reset like balmingtiger `lookto(0,0,120,…)` — front of store. */
export function resetCamera(controls: Controls, duration = 2) {
  const front = {
    id: '_front',
    object: '',
    nav: '',
    hint: '',
    title: '',
    kicker: '',
    intro: '',
    accent: '#fff',
    u: START_LOOK_U,
    v: START_LOOK_V,
    w: 1,
    h: 1,
    lookFov: MFOV_EXPLORE,
    sfx: 'click',
    items: [],
  } satisfies Section;
  return lookToSection(controls, front, { duration });
}
