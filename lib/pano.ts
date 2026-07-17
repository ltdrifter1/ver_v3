/**
 * Shared geometry for the panorama. The illustration is 1536x1024 (aspect 1.5).
 * The scene maps it onto a plane of PLANE_W x PLANE_H centred at the origin so
 * that hotspot (u,v) coordinates can be converted to world space consistently.
 */
export const PANO_ASPECT = 1536 / 1024; // 1.5
export const PLANE_H = 10;
export const PLANE_W = PLANE_H * PANO_ASPECT; // 15

/** Convert a normalised image coordinate to plane-local world coordinates. */
export function uvToLocal(u: number, v: number): [number, number] {
  const x = (u - 0.5) * PLANE_W;
  const y = (0.5 - v) * PLANE_H;
  return [x, y];
}

export const TEXTURE_SRC = '/textures/store_pano.webp';
export const LQIP_SRC = '/textures/store_pano_lqip.webp';
