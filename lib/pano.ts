/**
 * Shared geometry + view/control constants for the 360° store.
 *
 * Matched to balmingtiger.com's krpano 1.20 setup:
 *   <view hlookat="0" vlookat="0" fovtype="MFOV" fov="120"
 *         fovmin="70" fovmax="140" fisheye="0.3" />
 *   <control mode="drag" draginertia="0.1" dragfriction="0.9" />
 * Enter: fov 160 → 120 over 2s, then usercontrol=all (click-and-drag).
 */
export const PANO_WIDTH = 2048;
export const PANO_HEIGHT = 1024;
export const PANO_ASPECT = PANO_WIDTH / PANO_HEIGHT;

export const SPHERE_RADIUS = 48;

/** Pitch clamp (radians) — keeps poles out of a wide MFOV view. */
export const MAX_PITCH = 1.05;

export const MFOV_EXPLORE = 120;
export const MFOV_INTRO = 160;
export const INTRO_DUR = 2;

/**
 * Designed "front" of the store (listening booth / bins / CRT), equivalent of
 * krpano hlookat=0, vlookat=0 for this equirect.
 */
export const START_LOOK_U = 0.7;
export const START_LOOK_V = 0.5;

/**
 * krpano vtourskin defaults:
 *   draginertia="0.1"  — higher ⇒ less leftover momentum
 *   dragfriction="0.9" — lower ⇒ stops quicker (per-frame at 60fps)
 */
export const DRAG_INERTIA = 0.1;
export const DRAG_FRICTION = 0.9;
export const FRICTION_STOP = 0.002;

/**
 * How much of the viewport FOV a full-width drag covers.
 * krpano drag feels roughly 1:1 with the visible FOV.
 */
export const DRAG_FOV_GAIN = 1.0;

export const LOOK_KEY_STEP = 0.18;

/** MFOV (longer axis, degrees) → Three.js vertical FOV for this aspect. */
export function mfovToVerticalFov(mfovDeg: number, aspect: number): number {
  const m = ((mfovDeg * Math.PI) / 180) / 2;
  if (aspect >= 1) {
    return (2 * Math.atan(Math.tan(m) / aspect) * 180) / Math.PI;
  }
  return mfovDeg;
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

export const TEXTURE_SRC = '/textures/store_pano.webp';
export const LQIP_SRC = '/textures/store_pano_lqip.webp';
