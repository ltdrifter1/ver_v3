'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import {
  DRAG_FRICTION,
  FRICTION_STOP,
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
  /** Flips true when the gate opens — starts the intro zoom. */
  enteredRef: { value: boolean };
  /** Hotspots live only after intro unlocks look. */
  liveRef: { value: boolean };
  panelOpenRef: { value: boolean };
  onOpen: (id: string) => void;
  onIntroComplete?: () => void;
  debug?: boolean;
};

/**
 * Camera rig — balmingtiger / krpano parity:
 * - MFOV 120 explore, intro 160→120 over 2s
 * - Look locked during intro
 * - After unlock: click-and-drag with instant tracking + inertia
 */
function Rig({
  controls,
  env,
  enteredRef,
  onIntroComplete,
}: {
  controls: Controls;
  env: SceneEnv;
  enteredRef: { value: boolean };
  onIntroComplete?: () => void;
}) {
  const { camera, size } = useThree();
  const startYaw = uToYaw(START_LOOK_U);
  const startPitch = vToPitch(START_LOOK_V);
  const yaw = useRef(startYaw);
  const pitch = useRef(startPitch);
  const introElapsed = useRef(0);
  const wasEntered = useRef(false);
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
    controls.velocity.x = 0;
    controls.velocity.y = 0;
    yaw.current = startYaw;
    pitch.current = startPitch;
    introElapsed.current = 0;
    wasEntered.current = false;
    introDone.current = false;
  }, [camera, controls, startYaw, startPitch]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const exploreFov = mfovToVerticalFov(MFOV_EXPLORE, aspect);
    const introFov = mfovToVerticalFov(MFOV_INTRO, aspect);
    const dt = Math.min(0.05, delta);

    // —— Intro: gate opened → FOV ease, look locked ——
    if (enteredRef.value && !wasEntered.current) {
      wasEntered.current = true;
      introElapsed.current = env.reduceMotion ? INTRO_DUR : 0;
      controls.lookTarget.x = startYaw;
      controls.lookTarget.y = startPitch;
      controls.velocity.x = 0;
      controls.velocity.y = 0;
      yaw.current = startYaw;
      pitch.current = startPitch;
    }

    if (wasEntered.current && introElapsed.current < INTRO_DUR) {
      introElapsed.current = Math.min(INTRO_DUR, introElapsed.current + dt);
      controls.lookTarget.x = startYaw;
      controls.lookTarget.y = startPitch;
      controls.velocity.x = 0;
      controls.velocity.y = 0;
      yaw.current = startYaw;
      pitch.current = startPitch;
    }

    if (wasEntered.current && !introDone.current && introElapsed.current >= INTRO_DUR) {
      introDone.current = true;
      onIntroCompleteRef.current?.();
    }

    const introT = wasEntered.current
      ? easeInOutCubic(Math.min(1, introElapsed.current / INTRO_DUR))
      : 0;
    cam.fov = THREE.MathUtils.lerp(introFov, exploreFov, introT);
    cam.updateProjectionMatrix();

    const looking = introDone.current;

    if (looking) {
      // Clamp pitch on the shared target
      controls.lookTarget.y = THREE.MathUtils.clamp(
        controls.lookTarget.y,
        -MAX_PITCH,
        MAX_PITCH,
      );

      if (controls.dragging) {
        // krpano mode="drag": view follows instantly while held
        yaw.current = controls.lookTarget.x;
        pitch.current = controls.lookTarget.y;
      } else {
        // Inertia after release (dragfriction per 60fps frame)
        if (!env.reduceMotion) {
          const spd = Math.hypot(controls.velocity.x, controls.velocity.y);
          if (spd > FRICTION_STOP) {
            controls.lookTarget.x = wrapYaw(
              controls.lookTarget.x + controls.velocity.x * dt,
            );
            controls.lookTarget.y = THREE.MathUtils.clamp(
              controls.lookTarget.y + controls.velocity.y * dt,
              -MAX_PITCH,
              MAX_PITCH,
            );
            const decay = Math.pow(DRAG_FRICTION, dt * 60);
            controls.velocity.x *= decay;
            controls.velocity.y *= decay;
          } else {
            controls.velocity.x = 0;
            controls.velocity.y = 0;
          }
        } else {
          controls.velocity.x = 0;
          controls.velocity.y = 0;
        }

        // Snappy catch-up to target (still instant-feeling)
        const k = 1 - Math.exp(-dt * 40);
        let dy = controls.lookTarget.x - yaw.current;
        if (dy > Math.PI) dy -= TWO_PI;
        if (dy < -Math.PI) dy += TWO_PI;
        yaw.current = wrapYaw(yaw.current + dy * k);
        pitch.current += (controls.lookTarget.y - pitch.current) * k;
      }
    }

    const breathYaw = env.reduceMotion || !looking ? 0 : Math.sin(t * 0.11) * 0.005;
    const breathPitch = env.reduceMotion || !looking ? 0 : Math.cos(t * 0.09) * 0.0035;

    env.look.x = yaw.current + breathYaw;
    env.look.y = pitch.current + breathPitch;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = env.look.x;
    camera.rotation.x = env.look.y;

    if (!env.reduceMotion && looking) {
      camera.rotation.z = Math.sin(t * 0.05) * 0.002;
      camera.position.x = Math.sin(t * 0.1) * 0.025;
      camera.position.y = Math.cos(t * 0.083) * 0.018;
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
  enteredRef,
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
        enteredRef={enteredRef}
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
