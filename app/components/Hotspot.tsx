'use client';

import { useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

import { uvToLocal } from '@/lib/pano';
import type { Section } from '@/app/data/sections';
import { useSceneEnv } from './sceneContext';
import type { Controls } from './sceneContext';

const tmp = new THREE.Vector3();

export default function Hotspot({
  section,
  onOpen,
  controls,
  debug = false,
}: {
  section: Section;
  onOpen: (id: string) => void;
  controls: Controls;
  debug?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const inner = useRef<HTMLDivElement>(null);
  const opacity = useRef(0);
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const { camera, gl } = useThree();
  const [x, y] = uvToLocal(section.u, section.v);

  useFrame(() => {
    const m = mesh.current;
    const el = inner.current;
    if (!m || !el) return;

    // proximity to the centre of the frame -> gentle discovery reveal
    m.getWorldPosition(tmp).project(camera);
    const dist = Math.hypot(tmp.x, tmp.y);
    const proximity = THREE.MathUtils.clamp(1 - (dist - 0.18) / 0.55, 0, 1);

    let target = Math.max(proximity * 0.85, hovered ? 1 : 0);
    if (!env.live.value) target = 0;
    if (env.panelOpen.value) target *= 0.0;

    opacity.current += (target - opacity.current) * 0.12;
    el.style.opacity = opacity.current.toFixed(3);
    // hide entirely behind the wall when fully off
    el.style.visibility = opacity.current < 0.01 ? 'hidden' : 'visible';
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (controls.dragged) return; // ignore clicks that were really drags
    onOpen(section.id);
  };

  return (
    <mesh
      ref={mesh}
      position={[x, y, 0.05]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!env.live.value) return;
        setHovered(true);
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        gl.domElement.style.cursor = '';
      }}
      onClick={handleClick}
    >
      <planeGeometry args={[section.w, section.h]} />
      {/* invisible, but still raycastable (debug tints it for alignment) */}
      <meshBasicMaterial
        transparent
        opacity={debug ? 0.28 : 0}
        color={debug ? section.accent : '#ffffff'}
        depthWrite={false}
      />

      <Html center prepend zIndexRange={[15, 10]} style={{ pointerEvents: 'none' }}>
        <div
          ref={inner}
          className="hint"
          style={
            {
              opacity: 0,
              ['--hint-accent' as string]: section.accent,
            } as React.CSSProperties
          }
        >
          <span className={`hint-ring ${hovered ? 'hint-pulse' : ''}`} />
          <span className="hint-label">{section.hint}</span>
          <span className="hint-nav">{section.nav}</span>
        </div>
      </Html>
    </mesh>
  );
}
