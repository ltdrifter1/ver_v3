'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { useSceneEnv, type Controls } from './sceneContext';

const origin = new THREE.Vector3(0, 0, 0);
const tmp = new THREE.Vector3();

/** Ceiling lamp in the store — toggles lights on/off (balmingtiger lamp hotspot). */
export const LAMP_U = 0.5;
export const LAMP_V = 0.16;

function makeLampGlow() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 220, 120, 1)');
  g.addColorStop(0.25, 'rgba(255, 180, 60, 0.85)');
  g.addColorStop(0.55, 'rgba(255, 140, 40, 0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.beginPath();
  ctx.ellipse(128, 118, 28, 36, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,245,200,0.9)';
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function LampHotspot({
  controls,
  lightsOn,
  onToggle,
}: {
  controls: Controls;
  lightsOn: boolean;
  onToggle: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const glowMesh = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const hint = useRef<HTMLDivElement>(null);
  const glow = useRef({ a: lightsOn ? 0.55 : 0.15 });
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const [x, y, z] = useMemo(
    () => uvToSpherical(LAMP_U, LAMP_V, SPHERE_RADIUS - 0.55),
    [],
  );
  const tex = useMemo(() => makeLampGlow(), []);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
    glowMesh.current?.lookAt(origin);
    return () => tex.dispose();
  }, [x, y, z, tex]);

  useLayoutEffect(() => {
    gsap.to(glow.current, {
      a: lightsOn ? (hovered ? 1 : 0.55) : hovered ? 0.7 : 0.12,
      duration: 0.4,
      ease: 'power1.inOut',
      overwrite: true,
    });
  }, [lightsOn, hovered]);

  useFrame(({ camera }) => {
    if (glowMat.current) glowMat.current.opacity = glow.current.a;
    const el = hint.current;
    const m = mesh.current;
    if (!el || !m) return;
    m.getWorldPosition(tmp).project(camera);
    const inFront = tmp.z > -1 && tmp.z < 1;
    const dist = Math.hypot(tmp.x, tmp.y);
    const near = inFront && dist < 0.55;
    const show = env.live.value && !env.panelOpen.value && (hovered || near) ? 1 : 0;
    el.style.opacity = String(show);
    el.style.visibility = show < 0.02 ? 'hidden' : 'visible';
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (controls.dragged || controls.lookAnimating || !env.live.value) return;
    onToggle();
  };

  return (
    <group position={[x, y, z]}>
      <mesh ref={glowMesh} renderOrder={1}>
        <planeGeometry args={[5.5, 7]} />
        <meshBasicMaterial
          ref={glowMat}
          map={tex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.5}
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
        }}
        onClick={handleClick}
        userData={{ hotspotId: 'lamp', nav: 'Lights' }}
      >
        <planeGeometry args={[3.2, 4.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        <Html center prepend occlude={false} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }} distanceFactor={30}>
          <div
            ref={hint}
            className="hint"
            data-hotspot="lamp"
            style={{ opacity: 0, ['--hint-accent' as string]: '#ffc070' } as React.CSSProperties}
          >
            <span className={`hint-ring ${hovered ? 'hint-pulse' : ''}`} />
            <span className="hint-label">{lightsOn ? 'Kill the lights' : 'Lights up'}</span>
            <span className="hint-nav">Lights</span>
          </div>
        </Html>
      </mesh>
    </group>
  );
}
