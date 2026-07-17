'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import {
  INTRO_DUR,
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
  /** Fires once when the intro drop/zoom finishes — unlock click-and-drag look. */
  onIntroComplete?: () => void;
  debug?: boolean;
};

/**
 * Orbit rig matching balmingtiger.com:
 * - MFOV 120 explore scale (responsive → vertical FOV)
 * - start at designed front; look locked through intro FOV ease
 * - click-and-drag only after intro (no hover lean)
 */
function Rig({
  controls,
  env,
  liveRef,
  onIntroComplete,
}: {
  controls: Controls;
  env: SceneEnv;
  liveRef: { value: boolean };
  onIntroComplete?: () => void;
}) {
  const { camera, size } = useThree();
  const startYaw = uToYaw(START_LOOK_U);
  const startPitch = vToPitch(START_LOOK_V);
  const yaw = useRef(startYaw);
  const pitch = useRef(startPitch);
  const introElapsed = useRef(0);
  const wasLive = useRef(false);
  const introDone = useRef(false);
  const onIntroCompleteRef = useRef(onIntroComplete);
  onIntroCompleteRef.current = onIntroComplete;

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
    introDone.current = false;
  }, [camera, controls, startYaw, startPitch]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const exploreFov = mfovToVerticalFov(MFOV_EXPLORE, aspect);
    const introFov = mfovToVerticalFov(MFOV_INTRO, aspect);

    if (liveRef.value && !wasLive.current) {
      wasLive.current = true;
      introElapsed.current = env.reduceMotion ? INTRO_DUR : 0;
      // Hold the designed start pose through the whole intro.
      controls.lookTarget.x = startYaw;
      controls.lookTarget.y = startPitch;
      yaw.current = startYaw;
      pitch.current = startPitch;
    }

    if (wasLive.current && introElapsed.current < INTRO_DUR) {
      introElapsed.current = Math.min(INTRO_DUR, introElapsed.current + delta);
      // Keep look locked while the zoom-out plays — ignore any stray input.
      controls.lookTarget.x = startYaw;
      controls.lookTarget.y = startPitch;
      yaw.current = startYaw;
      pitch.current = startPitch;
    }

    if (wasLive.current && !introDone.current && introElapsed.current >= INTRO_DUR) {
      introDone.current = true;
      onIntroCompleteRef.current?.();
    }

    const introT = wasLive.current
      ? easeInOutCubic(Math.min(1, introElapsed.current / INTRO_DUR))
      : 0;
    cam.fov = THREE.MathUtils.lerp(introFov, exploreFov, introT);
    cam.updateProjectionMatrix();

    const looking = introDone.current;
    const targetYaw = looking ? wrapYaw(controls.lookTarget.x) : startYaw;
    const targetPitch = looking
      ? THREE.MathUtils.clamp(controls.lookTarget.y, -MAX_PITCH, MAX_PITCH)
      : startPitch;
    if (looking) controls.lookTarget.y = targetPitch;

    const k = looking ? 1 - Math.exp(-delta * 28) : 1;
    let dy = targetYaw - yaw.current;
    if (dy > Math.PI) dy -= TWO_PI;
    if (dy < -Math.PI) dy += TWO_PI;
    yaw.current = wrapYaw(yaw.current + dy * k);
    pitch.current += (targetPitch - pitch.current) * k;

    const breathYaw = env.reduceMotion || !looking ? 0 : Math.sin(t * 0.11) * 0.006;
    const breathPitch = env.reduceMotion || !looking ? 0 : Math.cos(t * 0.09) * 0.004;

    env.look.x = yaw.current + breathYaw;
    env.look.y = pitch.current + breathPitch;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = env.look.x;
    camera.rotation.x = env.look.y;
    if (!env.reduceMotion && looking) {
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
  onIntroComplete,
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
      <Rig
        controls={controls}
        env={env}
        liveRef={liveRef}
        onIntroComplete={onIntroComplete}
      />

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
