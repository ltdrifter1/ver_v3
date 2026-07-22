'use client';

import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import type { Controls } from './sceneContext';
import {
  DRAG_INERTIA,
  FOLLOW_OFF_DUR,
  FOLLOW_REENABLE_DELAY,
  FOLLOW_REENABLE_DUR,
  LOOK_KEY_STEP,
  MFOV_EXPLORE,
  MFOV_MAX,
  MFOV_MIN,
  MOUSE_FOV_CHANGE,
  mfovToHorizontalFov,
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
 * krpano-style click-and-drag look — balmingtiger.com / vtourskin parity.
 *
 * control.mouse="drag" / touch="drag":
 *   - Grab the panorama; content follows the pointer (pano-drag).
 *   - View tracks instantly while held.
 *   - Release keeps a short inertia tail (draginertia / dragfriction).
 *
 * Also:
 *   - followmousecontrol lean (desktop, no-touch) via pointer + followFactor
 *   - mouse-wheel / trackpad FOV zoom (fovmin…fovmax)
 *   - Arrow keys for a11y
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
    mfov: MFOV_EXPLORE,
    fisheye: 0.3,
    pointer: { x: 0, y: 0 },
    followFactor: 0,
    userControl: false,
    lookAnimating: false,
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
    let followTween: gsap.core.Tween | null = null;
    let followDelay: gsap.core.Tween | null = null;

    const w = () => Math.max(1, stage.clientWidth || window.innerWidth);
    const h = () => Math.max(1, stage.clientHeight || window.innerHeight);

    const killFollowTweens = () => {
      followTween?.kill();
      followDelay?.kill();
      followTween = null;
      followDelay = null;
    };

    /** Radians per pixel from current MFOV (dragscale=0 → FOV-linked). */
    const perPixel = () => {
      const aspect = w() / h();
      const vfov = mfovToVerticalFov(controls.mfov, aspect) * DEG;
      const hfov = mfovToHorizontalFov(controls.mfov, aspect) * DEG;
      return { yaw: hfov / w(), pitch: vfov / h() };
    };

    const syncPointer = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const pw = Math.max(1, rect.width);
      const ph = Math.max(1, rect.height);
      controls.pointer.x = (e.clientX - rect.left) / pw - 0.5;
      controls.pointer.y = (e.clientY - rect.top) / ph - 0.5;
    };

    const onDown = (e: PointerEvent) => {
      if (!enabledRef.current || !controls.userControl || controls.lookAnimating) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      syncPointer(e);
      controls.dragging = true;
      controls.dragged = false;
      controls.velocity.x = 0;
      controls.velocity.y = 0;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      lastT = performance.now();
      touch = e.pointerType === 'touch';
      stage.classList.add('dragging');

      // vtourskin: onmousedown → tween(followfactor, 0.0, 0.2)
      killFollowTweens();
      followTween = gsap.to(controls, {
        followFactor: 0,
        duration: FOLLOW_OFF_DUR,
        ease: 'power1.out',
        overwrite: true,
      });

      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onMove = (e: PointerEvent) => {
      syncPointer(e);
      if (!enabledRef.current || !controls.userControl || !controls.dragging) return;

      const now = performance.now();
      const dt = Math.max(1 / 120, (now - lastT) / 1000);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      const { yaw, pitch } = perPixel();
      // Pano-drag (krpano mode=drag): drag right → content moves right → look left.
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
      const wasDrag = controls.dragged;
      controls.dragging = false;
      stage.classList.remove('dragging');
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      // vtourskin: onmouseup → delayedcall(1.0, tween(followfactor, 1.0, 3.0))
      if (!touch && controls.userControl) {
        killFollowTweens();
        followDelay = gsap.delayedCall(FOLLOW_REENABLE_DELAY, () => {
          followTween = gsap.to(controls, {
            followFactor: 1,
            duration: FOLLOW_REENABLE_DUR,
            ease: 'power1.out',
            overwrite: true,
          });
        });
      }

      if (wasDrag) {
        window.setTimeout(() => {
          if (!controls.dragging) controls.dragged = false;
        }, 0);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current || !controls.userControl || controls.lookAnimating) return;
      const step = LOOK_KEY_STEP;
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
      } else if (e.key === '+' || e.key === '=') {
        controls.mfov = Math.max(MFOV_MIN, controls.mfov - MOUSE_FOV_CHANGE * 3);
      } else if (e.key === '-' || e.key === '_') {
        controls.mfov = Math.min(MFOV_MAX, controls.mfov + MOUSE_FOV_CHANGE * 3);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!enabledRef.current || !controls.userControl || controls.lookAnimating) return;
      e.preventDefault();
      // krpano mousefovchange — wheel up zooms in (smaller FOV)
      const delta = Math.sign(e.deltaY) * MOUSE_FOV_CHANGE * Math.min(8, Math.abs(e.deltaY) / 40);
      controls.mfov = Math.min(MFOV_MAX, Math.max(MFOV_MIN, controls.mfov + delta));
    };

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);

    return () => {
      killFollowTweens();
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
