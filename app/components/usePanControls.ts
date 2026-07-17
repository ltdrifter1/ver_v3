'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Controls } from './sceneContext';

const DRAG_THRESHOLD = 6; // px before a press counts as a drag
const TWO_PI = Math.PI * 2;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

/**
 * Unified pointer / touch / wheel / keyboard look-around for the 360° room.
 * Updates a stable mutable `controls` object read every frame by the scene.
 * Yaw is free (full spin); pitch is left unclamped here and clamped in the Rig.
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

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const onDown = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      controls.dragging = true;
      controls.dragged = false;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      touch = e.pointerType === 'touch';
      stage.classList.add('dragging');
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
      // drag right → look right (negative yaw in YXZ with our sphere layout)
      const speed = touch ? 2.8 : 2.4;
      controls.lookTarget.x = wrapYaw(controls.lookTarget.x - (dx / w()) * speed * Math.PI);
      controls.lookTarget.y += (dy / h()) * speed * 1.1;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) {
        controls.dragged = true;
      }
    };

    const onUp = () => {
      controls.dragging = false;
      stage.classList.remove('dragging');
    };

    const onWheel = (e: WheelEvent) => {
      if (!enabledRef.current) return;
      // horizontal wheel / trackpad → yaw; vertical → pitch
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        controls.lookTarget.x = wrapYaw(controls.lookTarget.x + e.deltaX * 0.0024);
      } else {
        controls.lookTarget.y += e.deltaY * 0.0018;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const step = 0.14;
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
