/**
 * Shared geometry for the 360° store. The equirectangular illustration is
 * 2048×1024 (aspect 2:1) and maps onto an inward-facing sphere (BackSide).
 * Hotspot (u,v) are normalised image coordinates (u left→right around yaw,
 * v top→bottom).
 */
export const PANO_WIDTH = 2048;
export const PANO_HEIGHT = 1024;
export const PANO_ASPECT = PANO_WIDTH / PANO_HEIGHT; // 2

/** Sphere radius in world units. Camera sits at the origin looking out. */
export const SPHERE_RADIUS = 48;

/** Max look pitch from the horizon (radians). Avoids pole spinning. */
export const MAX_PITCH = 1.15;

/**
 * Convert a normalised equirectangular (u,v) to a world-space point on (or
 * slightly inside) the sphere. Authored against the flopped texture + BackSide
 * skybox so u still increases looking right from the start pose.
 *
 * u: 0→1 left→right around full yaw (in the *visual* store, not raw file order)
 * v: 0→1 top→bottom (zenith→nadir)
 */
export function uvToSpherical(
  u: number,
  v: number,
  radius: number = SPHERE_RADIUS,
): [number, number, number] {
  // File is horizontally flopped; BackSide samples with mirrored u — net identity
  // with this yaw convention keeps authored u meaning "look right to increase u".
  const yaw = (u - 0.5) * Math.PI * 2; // -π .. π
  const pitch = (0.5 - v) * Math.PI; // +π/2 .. -π/2
  const cp = Math.cos(pitch);
  const x = Math.sin(yaw) * cp * radius;
  const y = Math.sin(pitch) * radius;
  const z = -Math.cos(yaw) * cp * radius;
  return [x, y, z];
}

/** @deprecated use uvToSpherical — kept as alias during migration */
export function uvToLocal(u: number, v: number): [number, number, number] {
  return uvToSpherical(u, v, SPHERE_RADIUS - 0.35);
}

export const TEXTURE_SRC = '/textures/store_pano.webp';
export const LQIP_SRC = '/textures/store_pano_lqip.webp';
