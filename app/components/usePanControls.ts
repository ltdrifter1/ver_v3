'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Controls } from './sceneContext';
import { LOOK_DRAG_GAIN, LOOK_KEY_STEP, MFOV_EXPLORE, mfovToVerticalFov } from '@/lib/pano';

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
 * Click-and-drag look-around only (plus arrow keys for a11y).
 * Hover lean and wheel pan are intentionally disabled — the room stays put
 * until the visitor grabs and drags, matching balmingtiger.com's explore feel.
 * `enabledRef` stays false through the intro drop/zoom, then flips on.
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
      // primary button / touch only — ignore right-click etc.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
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
      // No hover lean — look only changes while a drag is held.
      if (!enabledRef.current || !controls.dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const { yaw, pitch } = perPixel();
      controls.lookTarget.x = wrapYaw(controls.lookTarget.x - dx * yaw);
      controls.lookTarget.y += dy * pitch;
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
      if (e.key === 'ArrowLeft') controls.lookTarget.x = wrapYaw(controls.lookTarget.x + step);
      else if (e.key === 'ArrowRight') controls.lookTarget.x = wrapYaw(controls.lookTarget.x - step);
      else if (e.key === 'ArrowUp') controls.lookTarget.y += step;
      else if (e.key === 'ArrowDown') controls.lookTarget.y -= step;
    };

    // Prevent page scroll / trackpad from accidentally looking around
    const onWheel = (e: WheelEvent) => {
      if (!enabledRef.current) return;
      e.preventDefault();
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
