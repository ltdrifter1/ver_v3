'use client';

import { createContext, useContext } from 'react';

export type Vec2 = { x: number; y: number };

export type Controls = {
  /**
   * Look target in radians.
   * x = yaw (free, wraps), y = pitch (clamped by the rig).
   */
  lookTarget: Vec2;
  /** unused (kept for shape stability) — look is click-and-drag only */
  pointer: Vec2;
  /** true while a drag is in progress */
  dragging: boolean;
  /** true if the last gesture moved beyond the click threshold */
  dragged: boolean;
};

export type SceneEnv = {
  /** smoothed current look (yaw/pitch radians), incl. breathing */
  look: Vec2;
  /** elapsed time in seconds */
  time: number;
  /** whether the experience is live (post-gate) */
  live: { value: boolean };
  /** whether a panel is open (dims hotspots) */
  panelOpen: { value: boolean };
  /** honour reduced-motion */
  reduceMotion: boolean;
};

export const SceneContext = createContext<SceneEnv | null>(null);

export function useSceneEnv(): SceneEnv {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useSceneEnv must be used within SceneContext');
  return ctx;
}
