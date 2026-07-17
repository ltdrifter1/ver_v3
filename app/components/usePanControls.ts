'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Controls } from './sceneContext';

const clamp = (v: number, a = -1, b = 1) => Math.min(b, Math.max(a, v));
const DRAG_THRESHOLD = 6; // px before a press counts as a drag

/**
 * Unified pointer / touch / wheel / keyboard panning. Updates a stable mutable
 * `controls` object read every frame by the scene. Move + up are bound to the
 * window so a drag continues outside the element, while keeping the canvas free
 * to receive its own raycast events for hotspots.
 */
export function usePanControls(
  stageRef: RefObject<HTMLElement | null>,
  enabledRef: RefObject<boolean>,
) {
  const controls = useRef<Controls>({
    panTarget: { x: 0, y: 0 },
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
      const speed = touch ? 2.6 : 2.2;
      controls.panTarget.x = clamp(controls.panTarget.x - (dx / w()) * speed);
      controls.panTarget.y = clamp(controls.panTarget.y + (dy / h()) * speed);
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
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      controls.panTarget.x = clamp(controls.panTarget.x + d * 0.0012);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const step = 0.12;
      if (e.key === 'ArrowLeft') controls.panTarget.x = clamp(controls.panTarget.x - step);
      else if (e.key === 'ArrowRight') controls.panTarget.x = clamp(controls.panTarget.x + step);
      else if (e.key === 'ArrowUp') controls.panTarget.y = clamp(controls.panTarget.y + step);
      else if (e.key === 'ArrowDown') controls.panTarget.y = clamp(controls.panTarget.y - step);
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
