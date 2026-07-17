'use client';

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneEnv } from './sceneContext';

/**
 * A depth layer that translates opposite to the pan, scaled by `parallax`.
 * Layers nearer the camera (higher parallax) sweep further, producing depth.
 */
export default function ParallaxLayer({
  parallax,
  z,
  children,
}: {
  parallax: number;
  z: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const env = useSceneEnv();

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.position.x = -env.pan.x * env.range.x * parallax;
    g.position.y = -env.pan.y * env.range.y * parallax;
  });

  return (
    <group ref={ref} position={[0, 0, z]}>
      {children}
    </group>
  );
}
