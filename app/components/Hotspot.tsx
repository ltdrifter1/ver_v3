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

/**
 * Authored glow for a bright cel room.
 * Soft additive blooms wash out on Saturday-morning art — use a denser
 * coloured core + wide halo so hover / focus still reads.
 */
function makeGlowTexture(color: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Wide coloured wash
  const wash = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  wash.addColorStop(0, hexAlpha(color, 1));
  wash.addColorStop(0.22, hexAlpha(color, 0.95));
  wash.addColorStop(0.48, hexAlpha(color, 0.55));
  wash.addColorStop(0.78, hexAlpha(color, 0.18));
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 256, 256);

  // Hot white core so additive still pops on bright walls
  const core = ctx.createRadialGradient(128, 128, 0, 128, 128, 52);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.35, hexAlpha(color, 1));
  core.addColorStop(0.7, hexAlpha(color, 0.45));
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
 * invisible hit plane + glow on look/hover + latch while section open.
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
  const washMesh = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const washMat = useRef<THREE.MeshBasicMaterial>(null);
  const inner = useRef<HTMLDivElement>(null);
  const opacity = useRef(0);
  /** Current glow strength 0…1 (proximity / hover / active). */
  const glow = useRef({ a: 0 });
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const { camera, gl } = useThree();
  const [x, y, z] = uvToSpherical(section.u, section.v, SPHERE_RADIUS - 0.5);
  const glowTex = useMemo(() => makeGlowTexture(section.accent), [section.accent]);
  const isActive = activeId === section.id;
  const accentColor = useMemo(() => new THREE.Color(section.accent), [section.accent]);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
    glowMesh.current?.lookAt(origin);
    washMesh.current?.lookAt(origin);
  }, [x, y, z]);

  useLayoutEffect(() => {
    return () => {
      glowTex.dispose();
    };
  }, [glowTex]);

  // Keep a latched floor while this section is the open feature.
  useLayoutEffect(() => {
    if (!isActive) return;
    gsap.to(glow.current, {
      a: 1,
      duration: 0.4,
      ease: 'power1.inOut',
      overwrite: true,
    });
  }, [isActive]);

  useFrame(() => {
    const m = mesh.current;
    const el = inner.current;
    if (!m || !el) return;

    m.getWorldPosition(tmp).project(camera);
    const inFront = tmp.z > -1 && tmp.z < 1;
    const dist = Math.hypot(tmp.x, tmp.y);
    // Looking toward the feature (centre of view) counts as focus.
    const proximity = inFront
      ? THREE.MathUtils.clamp(1 - (dist - 0.08) / 0.55, 0, 1)
      : 0;

    // Hint labels
    let hintTarget = Math.max(proximity * 0.95, hovered ? 1 : 0);
    if (!env.live.value) hintTarget = 0;
    // Hide labels while a panel is open (glow still latches on active).
    if (env.panelOpen.value) hintTarget = 0;

    opacity.current += (hintTarget - opacity.current) * 0.18;
    el.style.opacity = opacity.current.toFixed(3);
    el.style.visibility = opacity.current < 0.02 ? 'hidden' : 'visible';

    // —— Glow drive ——
    // Active feature: full latch.
    // Otherwise: proximity look-at + hover, only while live and not another panel.
    let glowTarget = 0;
    if (!env.live.value) {
      glowTarget = 0;
    } else if (isActive) {
      glowTarget = 1;
    } else if (env.panelOpen.value) {
      glowTarget = 0;
    } else {
      glowTarget = Math.max(proximity * 0.85, hovered ? 1 : 0);
    }

    // Smooth toward target (hover/proximity); active latch also eased above.
    glow.current.a += (glowTarget - glow.current.a) * (isActive ? 0.22 : 0.16);

    const a = glow.current.a;
    if (glowMat.current) {
      // Additive bloom — boost past 1 via texture brightness; clamp display opacity.
      glowMat.current.opacity = Math.min(1, a * 1.15);
      glowMat.current.visible = a > 0.02;
    }
    if (washMat.current) {
      // Soft coloured plate underneath so glow still reads on bright cel walls.
      washMat.current.opacity = a * 0.28;
      washMat.current.visible = a > 0.02;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (controls.dragged || controls.lookAnimating) return;
    onOpen(section.id);
  };

  return (
    <group position={[x, y, z]}>
      {/* Coloured wash — readable on bright cartoon walls */}
      <mesh ref={washMesh} renderOrder={1} raycast={() => null}>
        <planeGeometry args={[section.w * 1.55, section.h * 1.55]} />
        <meshBasicMaterial
          ref={washMat}
          color={accentColor}
          transparent
          depthWrite={false}
          depthTest={false}
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Additive bloom on top */}
      <mesh ref={glowMesh} renderOrder={2} raycast={() => null}>
        <planeGeometry args={[section.w * 1.85, section.h * 1.85]} />
        <meshBasicMaterial
          ref={glowMat}
          map={glowTex}
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
            <span className={`hint-ring ${hovered || isActive || glow.current.a > 0.45 ? 'hint-pulse' : ''}`} />
            <span className="hint-label">{section.hint}</span>
            <span className="hint-nav">{section.nav}</span>
          </div>
        </Html>
      </mesh>
    </group>
  );
}
