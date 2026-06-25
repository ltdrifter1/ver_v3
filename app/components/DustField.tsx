'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeDotTexture } from '@/lib/sprites';
import { PLANE_W, PLANE_H } from '@/lib/pano';
import { useSceneEnv } from './sceneContext';

const SPREAD_X = PLANE_W * 1.2;
const SPREAD_Y = PLANE_H * 1.1;

export default function DustField({ count = 200 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const env = useSceneEnv();
  const tex = useMemo(() => makeDotTexture('#ffe1b0'), []);

  const { positions, speeds, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
      speeds[i] = 0.05 + Math.random() * 0.18;
      sizes[i] = 0.04 + Math.random() * 0.12;
    }
    return { positions, speeds, sizes };
  }, [count]);

  useFrame((_, delta) => {
    const p = points.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    const d = env.reduceMotion ? delta * 0.3 : delta;
    const t = env.time;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix + 1] += speeds[i] * d * 0.6;
      arr[ix] += Math.sin(t * 0.4 + i) * 0.0016;
      if (arr[ix + 1] > SPREAD_Y / 2) arr[ix + 1] = -SPREAD_Y / 2;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.14}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.55}
        toneMapped={false}
      />
    </points>
  );
}
