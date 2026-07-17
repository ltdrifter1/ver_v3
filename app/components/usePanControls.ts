'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Controls } from './sceneContext';
import {
  LOOK_DRAG_GAIN,
  LOOK_KEY_STEP,
  LOOK_WHEEL_GAIN,
  MFOV_EXPLORE,
  mfovToVerticalFov,
} from '@/lib/pano';

const DRAG_THRESHOLD = 5; // match balmingtiger Observer dragMinimum
const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

/**
 * Pointer / touch / wheel / keyboard look-around tuned to feel like
 * balmingtiger.com's krpano controls: snappy, FOV-scaled, low friction.
 */
export function usePanControls(
  stageRef: RefObject<HTMLElement | null>,
  enabledRef: RefObject<boolean>,
) {
  const controls = useRef<Controls>({
    lookTarget: { x: 0, y: 0 },
    pointer: { x: 0, y: 0 },
    dragging: false,
    dragged: false,
  }).current;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let touch = false;

    const w = () => Math.max(1, window.innerWidth);
    const h = () => Math.max(1, window.innerHeight);

    /** Radians of yaw/pitch per pixel, scaled to current MFOV like krpano. */
    const perPixel = () => {
      const aspect = w() / h();
      const mfov = MFOV_EXPLORE * DEG;
      const vfov = mfovToVerticalFov(MFOV_EXPLORE, aspect) * DEG;
      const hfov = aspect >= 1 ? mfov : 2 * Math.atan(Math.tan(vfov / 2) * aspect);
      const gain = touch ? LOOK_DRAG_GAIN * 1.15 : LOOK_DRAG_GAIN;
      return {
        yaw: (hfov / w()) * gain,
        pitch: (vfov / h()) * gain,
      };
    };

    const onDown = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      controls.dragging = true;
      controls.dragged = false;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      touch = e.pointerType === 'touch';
      stage.classList.add('dragging');
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      if (!touch && e.pointerType !== 'touch') {
        controls.pointer.x = (e.clientX / w()) * 2 - 1;
        controls.pointer.y = -((e.clientY / h()) * 2 - 1);
      }
      if (!controls.dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const { yaw, pitch } = perPixel();
      // drag right → look right
      controls.lookTarget.x = wrapYaw(controls.lookTarget.x - dx * yaw);
      controls.lookTarget.y += dy * pitch;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) {
        controls.dragged = true;
      }
    };

    const onUp = (e: PointerEvent) => {
      controls.dragging = false;
      stage.classList.remove('dragging');
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!enabledRef.current) return;
      // trackpads often report both axes — prefer the dominant one
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        controls.lookTarget.x = wrapYaw(controls.lookTarget.x + e.deltaX * LOOK_WHEEL_GAIN);
      } else {
        controls.lookTarget.y += e.deltaY * LOOK_WHEEL_GAIN;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const step = LOOK_KEY_STEP;
      if (e.key === 'ArrowLeft') controls.lookTarget.x = wrapYaw(controls.lookTarget.x + step);
      else if (e.key === 'ArrowRight') controls.lookTarget.x = wrapYaw(controls.lookTarget.x - step);
      else if (e.key === 'ArrowUp') controls.lookTarget.y += step;
      else if (e.key === 'ArrowDown') controls.lookTarget.y -= step;
    };

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);

    return () => {
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [stageRef, enabledRef, controls]);

  return controls;
}
