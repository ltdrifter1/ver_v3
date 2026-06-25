'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeBeamTexture } from '@/lib/sprites';
import { uvToLocal } from '@/lib/pano';
import { useSceneEnv } from './sceneContext';

/**
 * Reusable additive glow quad with a small flicker driver. Used for tungsten
 * shafts, neon signage and the CRT wash.
 */
export function AdditiveQuad({
  u,
  v,
  w,
  h,
  color = '#ffb347',
  base = 0.4,
  flickerSpeed = 1.2,
  flickerAmount = 0.18,
  spike = false,
  tex,
  z = 0,
}: {
  u: number;
  v: number;
  w: number;
  h: number;
  color?: string;
  base?: number;
  flickerSpeed?: number;
  flickerAmount?: number;
  spike?: boolean;
  tex?: THREE.Texture;
  z?: number;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const env = useSceneEnv();
  const [x, y] = uvToLocal(u, v);
  const phase = useMemo(() => Math.random() * 10, []);

  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const t = env.time + phase;
    let f = 1 - flickerAmount + flickerAmount * Math.sin(t * flickerSpeed);
    if (spike) {
      const s = Math.sin(t * 11.0) * Math.sin(t * 6.3 + 1.7);
      if (s > 0.82) f *= 0.35;
      else if (s > 0.7) f *= 0.7;
    }
    m.opacity = env.reduceMotion ? base : base * f;
  });

  return (
    <mesh position={[x, y, z]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        map={tex}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={base}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Tungsten shafts falling from the ceiling bulbs and lamps. */
export default function LightBeams() {
  const beam = useMemo(() => makeBeamTexture(), []);
  return (
    <group>
      <AdditiveQuad u={0.185} v={0.34} w={2.2} h={5.6} tex={beam} base={0.32} flickerSpeed={0.7} flickerAmount={0.1} color="#ffc070" />
      <AdditiveQuad u={0.44} v={0.3} w={2.6} h={6.2} tex={beam} base={0.28} flickerSpeed={0.5} flickerAmount={0.08} color="#ffb860" />
      <AdditiveQuad u={0.8} v={0.4} w={2.0} h={4.4} tex={beam} base={0.3} flickerSpeed={0.9} flickerAmount={0.12} color="#ffcf8a" />
    </group>
  );
}
