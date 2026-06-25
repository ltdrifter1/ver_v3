'use client';

import { createContext, useContext } from 'react';

export type Vec2 = { x: number; y: number };

export type Controls = {
  /** smoothed pan target in [-1,1], driven by pointer + drag */
  panTarget: Vec2;
  /** raw normalised pointer position in [-1,1] (desktop hover) */
  pointer: Vec2;
  /** true while a drag is in progress */
  dragging: boolean;
  /** true if the last gesture moved beyond the click threshold */
  dragged: boolean;
};

export type SceneEnv = {
  /** smoothed current pan applied to layers (incl. breathing), in [-1,1] */
  pan: Vec2;
  /** how far each axis can travel in world units (set by responsive camera) */
  range: Vec2;
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
