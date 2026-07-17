/**
 * Shared geometry for the 360° store. The equirectangular illustration is
 * 2048×1024 (aspect 2:1) and maps onto an inward-facing sphere (BackSide).
 * Hotspot (u,v) are normalised image coordinates (u left→right around yaw,
 * v top→bottom).
 *
 * View / control defaults mirror balmingtiger.com's krpano setup:
 *   <view hlookat="0" vlookat="0" fovtype="MFOV" fov="120" fovmin="70" fovmax="140" />
 */
export const PANO_WIDTH = 2048;
export const PANO_HEIGHT = 1024;
export const PANO_ASPECT = PANO_WIDTH / PANO_HEIGHT; // 2

/** Sphere radius in world units. Camera sits at the origin looking out. */
export const SPHERE_RADIUS = 48;

/**
 * Max look pitch from the horizon (radians).
 * Slightly tighter than before so a wide MFOV doesn't flash the poles.
 */
export const MAX_PITCH = 1.05;

/**
 * balmingtiger.com uses krpano MFOV 120 (the FOV of the longer viewport axis).
 * Enter animates 160 → 120; explore clamps between 70–140.
 */
export const MFOV_EXPLORE = 120;
export const MFOV_INTRO = 160;
export const MFOV_MIN = 70;
export const MFOV_MAX = 140;

/**
 * Starting look — equivalent of krpano hlookat=0, vlookat=0 aimed at the
 * designed "front" of the store (listening booth / bins / CRT composition).
 * u is the equirect column under the crosshair; pitch 0 = horizon.
 */
export const START_LOOK_U = 0.7;
export const START_LOOK_V = 0.5; // horizon

/** Drag gain: full-width drag ≈ MFOV × this (balmingtiger feels ~1:1–1.2). */
export const LOOK_DRAG_GAIN = 1.35;
/** Trackpad / wheel radians per deltaY unit. */
export const LOOK_WHEEL_GAIN = 0.0032;
/** Keyboard step in radians. */
export const LOOK_KEY_STEP = 0.2;

/**
 * Convert a krpano-style MFOV (degrees on the longer axis) to a Three.js
 * vertical FOV for the current aspect (width/height).
 */
export function mfovToVerticalFov(mfovDeg: number, aspect: number): number {
  const m = ((mfovDeg * Math.PI) / 180) / 2;
  if (aspect >= 1) {
    // landscape — MFOV is horizontal
    return (2 * Math.atan(Math.tan(m) / aspect) * 180) / Math.PI;
  }
  // portrait — MFOV is already vertical
  return mfovDeg;
}

/** Yaw (radians) that centres equirect column `u` in the view. */
export function uToYaw(u: number): number {
  return (u - 0.5) * Math.PI * 2;
}

/** Pitch (radians) that centres equirect row `v` in the view. */
export function vToPitch(v: number): number {
  return (0.5 - v) * Math.PI;
}

/**
 * Convert a normalised equirectangular (u,v) to a world-space point on (or
 * slightly inside) the sphere.
 */
export function uvToSpherical(
  u: number,
  v: number,
  radius: number = SPHERE_RADIUS,
): [number, number, number] {
  const yaw = uToYaw(u);
  const pitch = vToPitch(v);
  const cp = Math.cos(pitch);
  const x = Math.sin(yaw) * cp * radius;
  const y = Math.sin(pitch) * radius;
  const z = -Math.cos(yaw) * cp * radius;
  return [x, y, z];
}

/** @deprecated use uvToSpherical */
export function uvToLocal(u: number, v: number): [number, number, number] {
  return uvToSpherical(u, v, SPHERE_RADIUS - 0.35);
}

export const TEXTURE_SRC = '/textures/store_pano.webp';
export const LQIP_SRC = '/textures/store_pano_lqip.webp';
