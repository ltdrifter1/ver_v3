'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import {
  MAX_PITCH,
  MFOV_EXPLORE,
  MFOV_INTRO,
  SPHERE_RADIUS,
  START_LOOK_U,
  START_LOOK_V,
  TEXTURE_SRC,
  mfovToVerticalFov,
  uToYaw,
  vToPitch,
} from '@/lib/pano';
import { SECTIONS } from '@/app/data/sections';
import { SceneContext, type SceneEnv, type Controls } from './sceneContext';
import DustField from './DustField';
import LightBeams from './LightBeams';
import Flicker from './Flicker';
import Hotspot from './Hotspot';

const TWO_PI = Math.PI * 2;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

type Props = {
  controls: Controls;
  reduceMotion: boolean;
  liveRef: { value: boolean };
  panelOpenRef: { value: boolean };
  onOpen: (id: string) => void;
  debug?: boolean;
};

/**
 * Orbit rig matching balmingtiger.com:
 * - MFOV 120 explore scale (responsive → vertical FOV)
 * - start at designed front (hlookat/vlookat ≈ 0)
 * - snappy look follow, tiny cursor lean
 * - intro FOV ease 160 → 120 on enter
 */
function Rig({
  controls,
  env,
  liveRef,
}: {
  controls: Controls;
  env: SceneEnv;
  liveRef: { value: boolean };
}) {
  const { camera, size } = useThree();
  const startYaw = uToYaw(START_LOOK_U);
  const startPitch = vToPitch(START_LOOK_V);
  const yaw = useRef(startYaw);
  const pitch = useRef(startPitch);
  const introElapsed = useRef(0); // seconds since enter; 0→INTRO_DUR
  const wasLive = useRef(false);
  const INTRO_DUR = 2; // balmingtiger enter tween is 2s

  // Keep look target + camera projection in sync with the designed start pose.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.near = 0.1;
    cam.far = SPHERE_RADIUS * 3;
    cam.position.set(0, 0, 0);
    cam.rotation.order = 'YXZ';
    controls.lookTarget.x = startYaw;
    controls.lookTarget.y = startPitch;
    yaw.current = startYaw;
    pitch.current = startPitch;
    introElapsed.current = 0;
    wasLive.current = false;
  }, [camera, controls, startYaw, startPitch]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const exploreFov = mfovToVerticalFov(MFOV_EXPLORE, aspect);
    const introFov = mfovToVerticalFov(MFOV_INTRO, aspect);

    // Kick the intro ease the first frame we go live (shutter open).
    if (liveRef.value && !wasLive.current) {
      wasLive.current = true;
      introElapsed.current = env.reduceMotion ? INTRO_DUR : 0;
    }
    if (wasLive.current && introElapsed.current < INTRO_DUR) {
      introElapsed.current = Math.min(INTRO_DUR, introElapsed.current + delta);
    }

    const introT = wasLive.current
      ? easeInOutCubic(introElapsed.current / INTRO_DUR)
      : 0;
    cam.fov = THREE.MathUtils.lerp(introFov, exploreFov, introT);
    cam.updateProjectionMatrix();

    // Minimal cursor lean — balmingtiger is mostly direct drag, not pointer-follow
    const lean = controls.pointer;
    const leanAmt = controls.dragging ? 0 : 0.025;
    const targetYaw = wrapYaw(controls.lookTarget.x - lean.x * leanAmt);
    const targetPitch = THREE.MathUtils.clamp(
      controls.lookTarget.y + lean.y * leanAmt * 0.8,
      -MAX_PITCH,
      MAX_PITCH,
    );
    controls.lookTarget.y = targetPitch;

    // Snappy follow (was heavily lagged — felt insensitive). ~critically damped.
    const k = 1 - Math.exp(-delta * 28);
    let dy = targetYaw - yaw.current;
    if (dy > Math.PI) dy -= TWO_PI;
    if (dy < -Math.PI) dy += TWO_PI;
    yaw.current = wrapYaw(yaw.current + dy * k);
    pitch.current += (targetPitch - pitch.current) * k;

    const breathYaw = env.reduceMotion ? 0 : Math.sin(t * 0.11) * 0.006;
    const breathPitch = env.reduceMotion ? 0 : Math.cos(t * 0.09) * 0.004;

    env.look.x = yaw.current + breathYaw;
    env.look.y = pitch.current + breathPitch;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = env.look.x;
    camera.rotation.x = env.look.y;
    if (!env.reduceMotion) {
      camera.rotation.z = Math.sin(t * 0.05) * 0.0025;
      camera.position.x = Math.sin(t * 0.1) * 0.03;
      camera.position.y = Math.cos(t * 0.083) * 0.022;
    } else {
      camera.rotation.z = 0;
      camera.position.set(0, 0, 0);
    }
  }, -1);

  return null;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
    tex.flipY = true;
    tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
  }, [tex, gl]);

  const env = useMemo<SceneEnv>(
    () => ({
      look: { x: 0, y: 0 },
      time: 0,
      live: liveRef,
      panelOpen: panelOpenRef,
      reduceMotion,
    }),
    [liveRef, panelOpenRef, reduceMotion],
  );

  return (
    <SceneContext.Provider value={env}>
      <Rig controls={controls} env={env} liveRef={liveRef} />

      <color attach="background" args={['#070402']} />

      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <group>
        <LightBeams />
        <Flicker />
        {SECTIONS.map((s) => (
          <Hotspot key={s.id} section={s} onOpen={onOpen} controls={controls} debug={debug} />
        ))}
      </group>

      <DustField count={reduceMotion ? 90 : 240} />
    </SceneContext.Provider>
  );
}
