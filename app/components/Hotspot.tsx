'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { uvToSpherical, SPHERE_RADIUS } from '@/lib/pano';
import type { Section } from '@/app/data/sections';
import { useSceneEnv, type Controls } from './sceneContext';

const tmp = new THREE.Vector3();
const origin = new THREE.Vector3(0, 0, 0);

/**
 * Hotspot — balmingtiger pattern:
 * invisible hit plane + authored glow PNG (0.4s power1.inOut) + latch while open.
 */
export default function Hotspot({
  section,
  onOpen,
  controls,
  activeId = null,
  debug = false,
}: {
  section: Section;
  onOpen: (id: string) => void;
  controls: Controls;
  activeId?: string | null;
  debug?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const glowMesh = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const inner = useRef<HTMLDivElement>(null);
  const opacity = useRef(0);
  const glow = useRef({ a: 0 });
  const prox = useRef(0);
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const { camera, gl } = useThree();
  const [x, y, z] = uvToSpherical(section.u, section.v, SPHERE_RADIUS - 0.5);
  const isActive = activeId === section.id;

  const glowMap = useTexture(`/hotspots/${section.id}_glow.webp`);
  useLayoutEffect(() => {
    glowMap.colorSpace = THREE.SRGBColorSpace;
    glowMap.needsUpdate = true;
  }, [glowMap]);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
    glowMesh.current?.lookAt(origin);
  }, [x, y, z]);

  // Latch / hover glow — balmingtiger 0.4s power1.inOut
  useLayoutEffect(() => {
    const on = isActive || hovered;
    gsap.to(glow.current, {
      a: on ? 1 : Math.max(prox.current * 0.85, 0),
      duration: 0.4,
      ease: 'power1.inOut',
      overwrite: true,
    });
  }, [isActive, hovered]);

  useFrame(() => {
    const m = mesh.current;
    const el = inner.current;
    if (!m || !el) return;

    m.getWorldPosition(tmp).project(camera);
    const inFront = tmp.z > -1 && tmp.z < 1;
    const dist = Math.hypot(tmp.x, tmp.y);
    const proximity = inFront
      ? THREE.MathUtils.clamp(1 - (dist - 0.08) / 0.55, 0, 1)
      : 0;
    prox.current = proximity;

    let hintTarget = Math.max(proximity * 0.95, hovered ? 1 : 0);
    if (!env.live.value || env.panelOpen.value) hintTarget = 0;

    opacity.current += (hintTarget - opacity.current) * 0.18;
    el.style.opacity = opacity.current.toFixed(3);
    el.style.visibility = opacity.current < 0.02 ? 'hidden' : 'visible';

    // While not hovered/active, ease glow with proximity (look-at focus).
    if (!isActive && !hovered && env.live.value && !env.panelOpen.value) {
      const t = proximity * 0.85;
      glow.current.a += (t - glow.current.a) * 0.14;
    } else if (!isActive && !hovered && env.panelOpen.value) {
      glow.current.a += (0 - glow.current.a) * 0.2;
    }

    if (glowMat.current) {
      glowMat.current.opacity = glow.current.a;
      glowMat.current.visible = glow.current.a > 0.02;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (controls.dragged || controls.lookAnimating) return;
    onOpen(section.id);
  };

  return (
    <group position={[x, y, z]}>
      <mesh ref={glowMesh} renderOrder={2} raycast={() => null}>
        <planeGeometry args={[section.w * 1.85, section.h * 1.85]} />
        <meshBasicMaterial
          ref={glowMat}
          map={glowMap}
          color="#ffffff"
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh
        ref={mesh}
        renderOrder={3}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!env.live.value) return;
          setHovered(true);
          document.documentElement.classList.add('cursor-hot');
        }}
        onPointerOut={() => {
          setHovered(false);
          document.documentElement.classList.remove('cursor-hot');
          gl.domElement.style.cursor = '';
        }}
        onClick={handleClick}
        userData={{ hotspotId: section.id, nav: section.nav }}
      >
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
            <span className={`hint-ring ${hovered || isActive ? 'hint-pulse' : ''}`} />
            <span className="hint-label">{section.hint}</span>
            <span className="hint-nav">{section.nav}</span>
          </div>
        </Html>
      </mesh>
    </group>
  );
}
