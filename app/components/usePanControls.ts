'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Controls } from './sceneContext';
import {
  DRAG_FOV_GAIN,
  DRAG_INERTIA,
  LOOK_KEY_STEP,
  MFOV_EXPLORE,
  mfovToVerticalFov,
} from '@/lib/pano';

const DRAG_THRESHOLD = 5;
const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

/**
 * krpano-style click-and-drag look (control mode="drag").
 *
 * - Grab the panorama and drag — content follows the pointer (pano-drag).
 * - View tracks instantly while held; release keeps a short inertia tail
 *   (draginertia / dragfriction).
 * - No hover lean, no wheel pan. Arrow keys remain for a11y.
 * - `enabledRef` is false through the intro zoom, then flipped on.
 */
export function usePanControls(
  stageRef: RefObject<HTMLElement | null>,
  enabledRef: RefObject<boolean>,
) {
  const controls = useRef<Controls>({
    lookTarget: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
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
    let lastT = 0;
    let touch = false;

    const w = () => Math.max(1, window.innerWidth);
    const h = () => Math.max(1, window.innerHeight);

    /** Radians per pixel from current MFOV (1:1 with visible FOV). */
    const perPixel = () => {
      const aspect = w() / h();
      const mfov = MFOV_EXPLORE * DEG;
      const vfov = mfovToVerticalFov(MFOV_EXPLORE, aspect) * DEG;
      const hfov = aspect >= 1 ? mfov : 2 * Math.atan(Math.tan(vfov / 2) * aspect);
      const gain = touch ? DRAG_FOV_GAIN * 1.08 : DRAG_FOV_GAIN;
      return { yaw: (hfov / w()) * gain, pitch: (vfov / h()) * gain };
    };

    const onDown = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      controls.dragging = true;
      controls.dragged = false;
      controls.velocity.x = 0;
      controls.velocity.y = 0;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      lastT = performance.now();
      touch = e.pointerType === 'touch';
      stage.classList.add('dragging');
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!enabledRef.current || !controls.dragging) return;

      const now = performance.now();
      const dt = Math.max(1 / 120, (now - lastT) / 1000);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      const { yaw, pitch } = perPixel();
      // Pano-drag (krpano): drag right → content moves right → look left.
      const dYaw = dx * yaw;
      const dPitch = dy * pitch;
      controls.lookTarget.x = wrapYaw(controls.lookTarget.x + dYaw);
      controls.lookTarget.y += dPitch;

      // Rolling angular velocity; draginertia reduces leftover momentum.
      const retain = 1 - DRAG_INERTIA;
      controls.velocity.x = (dYaw / dt) * retain;
      controls.velocity.y = (dPitch / dt) * retain;

      if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) {
        controls.dragged = true;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!controls.dragging) return;
      controls.dragging = false;
      stage.classList.remove('dragging');
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const step = LOOK_KEY_STEP;
      // arrows match pano-drag mental model (left key looks left)
      if (e.key === 'ArrowLeft') {
        controls.lookTarget.x = wrapYaw(controls.lookTarget.x + step);
        controls.velocity.x = 0;
      } else if (e.key === 'ArrowRight') {
        controls.lookTarget.x = wrapYaw(controls.lookTarget.x - step);
        controls.velocity.x = 0;
      } else if (e.key === 'ArrowUp') {
        controls.lookTarget.y += step;
        controls.velocity.y = 0;
      } else if (e.key === 'ArrowDown') {
        controls.lookTarget.y -= step;
        controls.velocity.y = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Swallow wheel so trackpads don't scroll the page / nudge the look.
      if (enabledRef.current) e.preventDefault();
    };

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
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
