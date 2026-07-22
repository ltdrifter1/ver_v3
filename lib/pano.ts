/**
 * Shared geometry + view/control constants for the 360° store.
 *
 * Matched to balmingtiger.com (krpano 1.20.10 + vtourskin):
 *
 *   <view hlookat="0" vlookat="0" fovtype="MFOV" fov="120"
 *         fovmin="70" fovmax="140" maxpixelzoom="2.0"
 *         limitview="auto" fisheye="0.3" />
 *   <control mouse="drag" touch="drag"
 *            draginertia="0.1" dragfriction="0.9"
 *            mousefovchange="1.0" />
 *   skin_settings followmousecontrol="true"
 *     → followrange=10, followspeed=0.05
 *
 * Enter (site_scripts.js clickIntro + little-planet-style settle):
 *   start at ceiling → soft yaw pan → land on listening booth
 *   while fisheye 1→0.3 and fov 160→explore over ~3s
 */
export const PANO_WIDTH = 2048;
export const PANO_HEIGHT = 1024;
export const PANO_ASPECT = PANO_WIDTH / PANO_HEIGHT;

export const SPHERE_RADIUS = 48;

/** krpano view.mfovratio default (4:3). */
export const MFOV_RATIO = 4 / 3;

/**
 * Explore MFOV. Slightly wider than krpano's 120 so the painted shop
 * reads roomier (balmingtiger feel) without going back to 140.
 */
export const MFOV_EXPLORE = 130;
export const MFOV_INTRO = 160;
/**
 * Free-look wheel clamp (krpano fovmin/fovmax).
 * lookto may punch below this (video ~20) — wheel/keys stay in this range.
 */
export const MFOV_MIN = 70;
export const MFOV_MAX = 140;
/** Absolute floor for lookto punch-ins (video). */
export const MFOV_LOOKTO_MIN = 20;

/** Steady-state + intro fisheye (krpano view.fisheye). */
export const FISHEYE_EXPLORE = 0.3;
export const FISHEYE_INTRO = 1.0;

/** Enter tween — ceiling → pan → settle on hotspot. */
export const INTRO_DELAY = 0.35;
export const INTRO_DUR = 3.0;
/** Looking up at the lamp / ceiling at enter (equirect v). */
export const INTRO_CEILING_V = 0.1;
/** Soft yaw swing amplitude during the drop (degrees). */
export const INTRO_PAN_DEG = 16;
/** Hotspot the intro lands on (camera only — no panel). */
export const INTRO_SETTLE_ID = 'listening-booth';

/**
 * Designed "front" of the store (listening booth / bins / CRT),
 * equivalent of krpano hlookat=0, vlookat=0 for this equirect.
 */
/** Front of store after BackSide U-flip (texture u ↔ 1−u). */
export const START_LOOK_U = 0.32;
export const START_LOOK_V = 0.5;

/**
 * krpano vtourskin defaults:
 *   draginertia="0.1"  — higher ⇒ less leftover momentum
 *   dragfriction="0.9" — lower ⇒ stops quicker (per-frame at 60fps)
 */
export const DRAG_INERTIA = 0.1;
export const DRAG_FRICTION = 0.9;
export const FRICTION_STOP = 0.002;

/** control.mousefovchange — degrees of MFOV per wheel "notch" scale. */
export const MOUSE_FOV_CHANGE = 1.0;

/**
 * followmousecontrol (vtourskin skin_followmouse_init):
 *   followrange=10 (degrees), followspeed=0.05
 * On mousedown: followfactor → 0 in 0.2s
 * On mouseup: after 1s, followfactor → 1 over 3s
 */
export const FOLLOW_RANGE_DEG = 10;
export const FOLLOW_SPEED = 0.05;
export const FOLLOW_OFF_DUR = 0.2;
export const FOLLOW_REENABLE_DELAY = 1.0;
export const FOLLOW_REENABLE_DUR = 3.0;

export const LOOK_KEY_STEP = 0.09; // ≈ keybaccelerate feel per tap

/**
 * MFOV (degrees) → Three.js vertical FOV for this aspect.
 * Uses krpano's mfovratio (4/3): compare width vs height*mfovratio.
 */
export function mfovToVerticalFov(mfovDeg: number, aspect: number): number {
  const m = ((mfovDeg * Math.PI) / 180) / 2;
  const widthIsLonger = aspect >= MFOV_RATIO;
  if (widthIsLonger) {
    // Longer axis is width → HFOV = mfov, derive VFOV from aspect
    return (2 * Math.atan(Math.tan(m) / aspect) * 180) / Math.PI;
  }
  // Longer axis is (mfovratio-scaled) height → VFOV = mfov
  return mfovDeg;
}

/** Horizontal FOV (degrees) implied by current MFOV + aspect. */
export function mfovToHorizontalFov(mfovDeg: number, aspect: number): number {
  const vfov = mfovToVerticalFov(mfovDeg, aspect);
  if (aspect >= MFOV_RATIO) return mfovDeg;
  const v = ((vfov * Math.PI) / 180) / 2;
  return (2 * Math.atan(Math.tan(v) * aspect) * 180) / Math.PI;
}

/**
 * limitview="auto" pitch clamp for a full sphere:
 * keep the view inside ±90° given the current VFOV.
 */
export function autoPitchLimit(mfovDeg: number, aspect: number): number {
  const vfov = (mfovToVerticalFov(mfovDeg, aspect) * Math.PI) / 180;
  return Math.max(0.05, Math.PI / 2 - vfov / 2 - 0.02);
}

/**
 * followmouse zoomscale = max(1, 1/tan(vfov/2))
 * Stronger lean when zoomed in, subdued at wide MFOV.
 */
export function followZoomScale(mfovDeg: number, aspect: number): number {
  const vfov = (mfovToVerticalFov(mfovDeg, aspect) * Math.PI) / 180;
  const z = 1 / Math.tan(Math.max(0.05, vfov / 2));
  return Math.max(1, z);
}

export function uToYaw(u: number): number {
  return (u - 0.5) * Math.PI * 2;
}

export function vToPitch(v: number): number {
  return (0.5 - v) * Math.PI;
}

export function uvToSpherical(
  u: number,
  v: number,
  radius: number = SPHERE_RADIUS,
): [number, number, number] {
  const yaw = uToYaw(u);
  const pitch = vToPitch(v);
  const cp = Math.cos(pitch);
  return [
    Math.sin(yaw) * cp * radius,
    Math.sin(pitch) * radius,
    -Math.cos(yaw) * cp * radius,
  ];
}

export function uvToLocal(u: number, v: number): [number, number, number] {
  return uvToSpherical(u, v, SPHERE_RADIUS - 0.35);
}

/** v3 — bright 90s cartoon room (cache-bust from darker underground v2). */
export const TEXTURE_SRC = '/textures/store_pano_v3.webp';
/** Darkened twin of the store — balmingtiger lights_off scene. */
export const TEXTURE_OFF_SRC = '/textures/store_pano_off_v3.webp';
export const LQIP_SRC = '/textures/store_pano_lqip_v3.webp';
export const CRT_VIDEO_SRC = '/videos/crt_loop.mp4';
