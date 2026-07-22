/**
 * Mobile device-orientation look — krpano gyro plugin parity (simplified).
 * Requires a user gesture on iOS 13+ (DeviceOrientationEvent.requestPermission).
 */

export type GyroHandle = {
  enabled: boolean;
  /** Radians offset applied on top of lookTarget while active. */
  yaw: number;
  pitch: number;
};

const DEG = Math.PI / 180;

export function createGyro(): GyroHandle {
  return { enabled: false, yaw: 0, pitch: 0 };
}

export async function requestGyroPermission(): Promise<boolean> {
  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof DOE.requestPermission === 'function') {
    try {
      const res = await DOE.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

export function attachGyro(handle: GyroHandle): () => void {
  let baseAlpha: number | null = null;
  let baseBeta: number | null = null;

  const onOrient = (e: DeviceOrientationEvent) => {
    if (!handle.enabled) return;
    if (e.alpha == null || e.beta == null) return;

    if (baseAlpha == null) {
      baseAlpha = e.alpha;
      baseBeta = e.beta;
    }

    // alpha: compass yaw, beta: front-back tilt
    const dAlpha = ((e.alpha - baseAlpha!) + 540) % 360 - 180;
    const dBeta = e.beta - (baseBeta ?? 0);

    handle.yaw = -dAlpha * DEG;
    handle.pitch = THREE_CLAMP((-dBeta * DEG) * 0.65, -0.6, 0.6);
  };

  window.addEventListener('deviceorientation', onOrient, true);
  return () => {
    window.removeEventListener('deviceorientation', onOrient, true);
    handle.enabled = false;
    handle.yaw = 0;
    handle.pitch = 0;
    baseAlpha = null;
    baseBeta = null;
  };
}

function THREE_CLAMP(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function isGyroLikelyAvailable() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse && 'DeviceOrientationEvent' in window;
}
