'use client';

import { createContext, useContext } from 'react';

export type Vec2 = { x: number; y: number };

export type Controls = {
  /** Look target in radians — x = yaw (wraps), y = pitch (clamped in Rig). */
  lookTarget: Vec2;
  /** Angular velocity (rad/s) for krpano-style drag inertia after release. */
  velocity: Vec2;
  /** True while a pointer drag is held. */
  dragging: boolean;
  /** True if the gesture moved past the click threshold. */
  dragged: boolean;
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
