'use client';

import { createContext, useContext } from 'react';

export type Vec2 = { x: number; y: number };

/**
 * Mutable look state shared between pointer handlers and the camera Rig.
 * Mirrors the krpano view + control surface balmingtiger drives.
 */
export type Controls = {
  /** Look target in radians — x = yaw (wraps), y = pitch (clamped in Rig). */
  lookTarget: Vec2;
  /** Angular velocity (rad/s) for krpano draginertia / dragfriction after release. */
  velocity: Vec2;
  /** True while a pointer drag is held. */
  dragging: boolean;
  /** True if the gesture moved past the click threshold. */
  dragged: boolean;
  /** Current MFOV in degrees (krpano view.fov, fovtype=MFOV). */
  mfov: number;
  /** Fisheye distortion 0–1 (krpano view.fisheye). */
  fisheye: number;
  /** Pointer position normalised to stage centre (−0.5…0.5). */
  pointer: Vec2;
  /**
   * followmousecontrol blend (0 = off while dragging, 1 = full lean).
   * Tweened like vtourskin: off in 0.2s on down, back over 3s after 1s delay.
   */
  followFactor: number;
  /** usercontrol=all after intro — hotspots + drag enabled. */
  userControl: boolean;
};

export type SceneEnv = {
  look: Vec2;
  time: number;
  /** Hotspots / hints live only after intro unlocks look. */
  live: { value: boolean };
  panelOpen: { value: boolean };
  reduceMotion: boolean;
};

export const SceneContext = createContext<SceneEnv | null>(null);

export function useSceneEnv(): SceneEnv {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useSceneEnv must be used within SceneContext');
  return ctx;
}
