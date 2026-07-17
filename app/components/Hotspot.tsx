'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

import { uvToSpherical, SPHERE_RADIUS } from '@/lib/pano';
import type { Section } from '@/app/data/sections';
import { useSceneEnv, type Controls } from './sceneContext';

const tmp = new THREE.Vector3();
const origin = new THREE.Vector3(0, 0, 0);

/**
 * Invisible raycast target welded to an equirect (u,v). Reveals a hint when
 * brought toward centre (or hovered), opens the section panel on click.
 */
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
  const [x, y, z] = uvToSpherical(section.u, section.v, SPHERE_RADIUS - 0.5);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);

  useFrame(() => {
    const m = mesh.current;
    const el = inner.current;
    if (!m || !el) return;

    m.getWorldPosition(tmp).project(camera);
    // Behind the camera or far outside the frustum → hide
    const inFront = tmp.z > -1 && tmp.z < 1;
    const dist = Math.hypot(tmp.x, tmp.y);
    // Wider discovery cone so features read while you drag around
    const proximity = inFront
      ? THREE.MathUtils.clamp(1 - (dist - 0.12) / 0.7, 0, 1)
      : 0;

    let target = Math.max(proximity * 0.9, hovered ? 1 : 0);
    if (!env.live.value) target = 0;
    if (env.panelOpen.value) target = 0;

    opacity.current += (target - opacity.current) * 0.18;
    el.style.opacity = opacity.current.toFixed(3);
    el.style.visibility = opacity.current < 0.02 ? 'hidden' : 'visible';
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Ignore the pointerup of a drag, but allow a fresh tap/click
    if (controls.dragged) return;
    onOpen(section.id);
  };

  return (
    <mesh
      ref={mesh}
      position={[x, y, z]}
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
      userData={{ hotspotId: section.id, nav: section.nav }}
    >
      {/* Generous hit area — easy to click after dragging around the room */}
      <planeGeometry args={[section.w, section.h]} />
      <meshBasicMaterial
        transparent
        opacity={debug ? 0.3 : 0}
        color={debug ? section.accent : '#ffffff'}
        depthWrite={false}
        side={THREE.DoubleSide}
      />

      <Html
        center
        prepend
        occlude={false}
        zIndexRange={[20, 10]}
        style={{ pointerEvents: 'none' }}
        distanceFactor={28}
      >
        <div
          ref={inner}
          className="hint"
          data-nav={section.nav}
          data-hotspot={section.id}
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
