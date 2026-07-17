'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { PLANE_W, PLANE_H, TEXTURE_SRC } from '@/lib/pano';
import { SECTIONS } from '@/app/data/sections';
import { SceneContext, type SceneEnv, type Controls } from './sceneContext';
import ParallaxLayer from './ParallaxLayer';
import DustField from './DustField';
import LightBeams from './LightBeams';
import Flicker from './Flicker';
import Hotspot from './Hotspot';

const MATH_PI = Math.PI;
const FOV = 42;

type Props = {
  controls: Controls;
  reduceMotion: boolean;
  liveRef: { value: boolean };
  panelOpenRef: { value: boolean };
  onOpen: (id: string) => void;
  debug?: boolean;
};

/** Drives per-frame state: smoothing pan, breathing camera, responsive crop. */
function Rig({
  controls,
  env,
}: {
  controls: Controls;
  env: SceneEnv;
}) {
  const { camera, size } = useThree();
  const ux = useRef(0);
  const uy = useRef(0);

  // Responsive crop: fit the panorama so there is always overflow to explore on
  // both axes, regardless of viewport shape.
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fovRad = (FOV * MATH_PI) / 180;
    // visible height we want at the plane, capped so edges stay hidden
    let visH = Math.min(PLANE_H * 0.76, (PLANE_W * 0.9) / aspect);
    visH = Math.max(visH, PLANE_H * 0.42);
    const camZ = visH / 2 / Math.tan(fovRad / 2);
    const visW = visH * aspect;

    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = FOV;
    cam.position.set(0, 0, camZ);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();

    env.range.x = Math.max(0, (PLANE_W - visW) / 2);
    env.range.y = Math.max(0, (PLANE_H - visH) / 2);
  }, [camera, size.width, size.height, env]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;

    const lean = controls.pointer; // additive cursor lean (0 on touch)
    const targetX = THREE.MathUtils.clamp(controls.panTarget.x + lean.x * 0.18, -1.12, 1.12);
    const targetY = THREE.MathUtils.clamp(controls.panTarget.y + lean.y * 0.16, -1.12, 1.12);

    const k = 1 - Math.pow(0.0016, delta); // frame-rate independent smoothing
    ux.current += (targetX - ux.current) * k;
    uy.current += (targetY - uy.current) * k;

    const breathX = env.reduceMotion ? 0 : Math.sin(t * 0.13) * 0.02 + Math.sin(t * 0.07) * 0.012;
    const breathY = env.reduceMotion ? 0 : Math.cos(t * 0.11) * 0.016;

    env.pan.x = ux.current + breathX;
    env.pan.y = uy.current + breathY;

    // Camera breathing — a tiny truck/pedestal that also yields real parallax
    // between depth layers without translating the framing meaningfully.
    if (!env.reduceMotion) {
      camera.position.x = Math.sin(t * 0.1) * 0.05 + ux.current * 0.06;
      camera.position.y = Math.cos(t * 0.083) * 0.035 - uy.current * 0.05;
      camera.rotation.z = Math.sin(t * 0.05) * 0.004;
    }
  }, -1);

  return null;
}

export default function Scene({
  controls,
  reduceMotion,
  liveRef,
  panelOpenRef,
  onOpen,
  debug = false,
}: Props) {
  const tex = useTexture(TEXTURE_SRC);
  const { gl } = useThree();

  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
  }, [tex, gl]);

  const env = useMemo<SceneEnv>(
    () => ({
      pan: { x: 0, y: 0 },
      range: { x: 3, y: 1.5 },
      time: 0,
      live: liveRef,
      panelOpen: panelOpenRef,
      reduceMotion,
    }),
    [liveRef, panelOpenRef, reduceMotion],
  );

  return (
    <SceneContext.Provider value={env}>
      <Rig controls={controls} env={env} />

      {/* ambient warmth so additive elements read as tungsten light */}
      <color attach="background" args={['#070402']} />

      {/* far wall / main illustration + welded signage + hotspots */}
      <ParallaxLayer parallax={1} z={0}>
        <mesh>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>

        <LightBeams />
        <Flicker />

        {/* hotspots ride with the illustration so they stay registered */}
        {SECTIONS.map((s) => (
          <Hotspot key={s.id} section={s} onOpen={onOpen} controls={controls} debug={debug} />
        ))}
      </ParallaxLayer>

      {/* foreground dust — strongest parallax */}
      <ParallaxLayer parallax={1.9} z={3.2}>
        <DustField count={reduceMotion ? 90 : 220} />
      </ParallaxLayer>
    </SceneContext.Provider>
  );
}
