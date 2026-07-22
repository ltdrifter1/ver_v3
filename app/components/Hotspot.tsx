'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { uvToSpherical, SPHERE_RADIUS } from '@/lib/pano';
import type { Section } from '@/app/data/sections';
import { useSceneEnv, type Controls } from './sceneContext';

const tmp = new THREE.Vector3();
const origin = new THREE.Vector3(0, 0, 0);

/** Stronger authored glow — soft core + wide bloom (balmingtiger *_glow). */
function makeGlowTexture(color: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0, color);
  g.addColorStop(0.18, color);
  g.addColorStop(0.42, hexAlpha(color, 0.55));
  g.addColorStop(0.72, hexAlpha(color, 0.18));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // bright inner disc
  const core = ctx.createRadialGradient(128, 128, 0, 128, 128, 36);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(0.45, hexAlpha(color, 0.85));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hexAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Hotspot — balmingtiger pattern:
 * invisible hit plane + hover glow (0.4s power1.inOut) + latch while section open.
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
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const { camera, gl } = useThree();
  const [x, y, z] = uvToSpherical(section.u, section.v, SPHERE_RADIUS - 0.5);
  const glowTex = useMemo(() => makeGlowTexture(section.accent), [section.accent]);
  const isActive = activeId === section.id;

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
    glowMesh.current?.lookAt(origin);
  }, [x, y, z]);

  useLayoutEffect(() => {
    return () => {
      glowTex.dispose();
    };
  }, [glowTex]);

  // Latch glow while this section is focused; hover otherwise.
  useLayoutEffect(() => {
    const on = isActive || hovered;
    gsap.to(glow.current, {
      a: on ? 1 : 0,
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
      ? THREE.MathUtils.clamp(1 - (dist - 0.12) / 0.7, 0, 1)
      : 0;

    let target = Math.max(proximity * 0.9, hovered ? 1 : 0);
    if (!env.live.value || env.panelOpen.value) target = 0;

    opacity.current += (target - opacity.current) * 0.18;
    el.style.opacity = opacity.current.toFixed(3);
    el.style.visibility = opacity.current < 0.02 ? 'hidden' : 'visible';

    if (glowMat.current) {
      // Active section stays fully lit; others dim hard while focused.
      const scale = env.panelOpen.value ? (isActive ? 1 : 0) : 1;
      glowMat.current.opacity = glow.current.a * scale;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (controls.dragged || controls.lookAnimating) return;
    onOpen(section.id);
  };

  return (
    <group position={[x, y, z]}>
      <mesh ref={glowMesh} renderOrder={1}>
        <planeGeometry args={[section.w * 1.7, section.h * 1.7]} />
        <meshBasicMaterial
          ref={glowMat}
          map={glowTex}
          color="#ffffff"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh
        ref={mesh}
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
