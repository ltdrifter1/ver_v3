'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import {
  DRAG_FRICTION,
  FISHEYE_EXPLORE,
  FISHEYE_INTRO,
  FOLLOW_RANGE_DEG,
  FOLLOW_SPEED,
  FRICTION_STOP,
  INTRO_DELAY,
  INTRO_DUR,
  MFOV_EXPLORE,
  MFOV_INTRO,
  SPHERE_RADIUS,
  START_LOOK_U,
  START_LOOK_V,
  TEXTURE_SRC,
  autoPitchLimit,
  followZoomScale,
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
import FisheyePass from './FisheyePass';

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const FOLLOW_RANGE = FOLLOW_RANGE_DEG * DEG;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

type Props = {
  controls: Controls;
  reduceMotion: boolean;
  /** Flips true when the gate opens — starts the intro FOV/fisheye ease. */
  enteredRef: { value: boolean };
  /** Hotspots live only after intro unlocks look. */
  liveRef: { value: boolean };
  panelOpenRef: { value: boolean };
  onOpen: (id: string) => void;
  onIntroComplete?: () => void;
  debug?: boolean;
};

/**
 * Camera rig — exact balmingtiger / krpano parity:
 * - MFOV 120 explore, intro 160→120 + fisheye 1→0.3 over 2s (power3.inOut, delay 0.4)
 * - Look locked during intro; usercontrol=all on complete
 * - Click-and-drag with instant tracking + draginertia/dragfriction
 * - followmousecontrol lean on desktop (view.rx / view.ry)
 * - No artificial camera breath/position wobble
 */
function Rig({
  controls,
  env,
  enteredRef,
  onIntroComplete,
  fisheyeRef,
}: {
  controls: Controls;
  env: SceneEnv;
  enteredRef: { value: boolean };
  onIntroComplete?: () => void;
  fisheyeRef: { current: number };
}) {
  const { camera, size } = useThree();
  const startYaw = uToYaw(START_LOOK_U);
  const startPitch = vToPitch(START_LOOK_V);
  const yaw = useRef(startYaw);
  const pitch = useRef(startPitch);
  const followYaw = useRef(0);
  const followPitch = useRef(0);
  const wasEntered = useRef(false);
  const introDone = useRef(false);
  const introTween = useRef<gsap.core.Tween | null>(null);
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
    controls.mfov = MFOV_INTRO;
    controls.fisheye = FISHEYE_INTRO;
    controls.followFactor = 0;
    controls.userControl = false;
    fisheyeRef.current = FISHEYE_INTRO;
    yaw.current = startYaw;
    pitch.current = startPitch;
    followYaw.current = 0;
    followPitch.current = 0;
    wasEntered.current = false;
    introDone.current = false;
    return () => {
      introTween.current?.kill();
    };
  }, [camera, controls, startYaw, startPitch, fisheyeRef]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const dt = Math.min(0.05, delta);

    // —— Intro: gate opened → GSAP power3.inOut FOV + fisheye (balmingtiger clickIntro) ——
    if (enteredRef.value && !wasEntered.current) {
      wasEntered.current = true;
      controls.lookTarget.x = startYaw;
      controls.lookTarget.y = startPitch;
      controls.velocity.x = 0;
      controls.velocity.y = 0;
      yaw.current = startYaw;
      pitch.current = startPitch;
      controls.userControl = false;
      controls.followFactor = 0;

      const view = {
        mfov: MFOV_INTRO,
        fisheye: FISHEYE_INTRO,
      };
      controls.mfov = view.mfov;
      controls.fisheye = view.fisheye;
      fisheyeRef.current = view.fisheye;

      if (env.reduceMotion) {
        controls.mfov = MFOV_EXPLORE;
        controls.fisheye = FISHEYE_EXPLORE;
        fisheyeRef.current = FISHEYE_EXPLORE;
        introDone.current = true;
        controls.userControl = true;
        // Desktop lean on after unlock (touch keeps followFactor at 0)
        if (!window.matchMedia('(pointer: coarse)').matches) {
          controls.followFactor = 1;
        }
        onIntroCompleteRef.current?.();
      } else {
        introTween.current?.kill();
        introTween.current = gsap.fromTo(
          view,
          { mfov: MFOV_INTRO, fisheye: FISHEYE_INTRO },
          {
            mfov: MFOV_EXPLORE,
            fisheye: FISHEYE_EXPLORE,
            duration: INTRO_DUR,
            delay: INTRO_DELAY,
            ease: 'power3.inOut',
            onUpdate: () => {
              controls.mfov = view.mfov;
              controls.fisheye = view.fisheye;
              fisheyeRef.current = view.fisheye;
              // Look stays locked to start pose during intro (hlookat/vlookat 0)
              controls.lookTarget.x = startYaw;
              controls.lookTarget.y = startPitch;
              yaw.current = startYaw;
              pitch.current = startPitch;
              controls.velocity.x = 0;
              controls.velocity.y = 0;
            },
            onComplete: () => {
              controls.mfov = MFOV_EXPLORE;
              controls.fisheye = FISHEYE_EXPLORE;
              fisheyeRef.current = FISHEYE_EXPLORE;
              introDone.current = true;
              // set(control.usercontrol, all)
              controls.userControl = true;
              if (!window.matchMedia('(pointer: coarse)').matches) {
                controls.followFactor = 1;
              }
              onIntroCompleteRef.current?.();
            },
          },
        );
      }
    }

    if (!introDone.current && wasEntered.current) {
      // Hold look during intro tween
      controls.lookTarget.x = startYaw;
      controls.lookTarget.y = startPitch;
      yaw.current = startYaw;
      pitch.current = startPitch;
    }

    cam.fov = mfovToVerticalFov(controls.mfov, aspect);
    cam.updateProjectionMatrix();

    const looking = introDone.current;
    const maxPitch = autoPitchLimit(controls.mfov, aspect);

    if (looking) {
      controls.lookTarget.y = THREE.MathUtils.clamp(
        controls.lookTarget.y,
        -maxPitch,
        maxPitch,
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
              -maxPitch,
              maxPitch,
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

        // Instant catch-up to target (drag mode, not follow-smooth mode)
        yaw.current = controls.lookTarget.x;
        pitch.current = controls.lookTarget.y;
      }
    }

    // —— followmousecontrol: view.rx / view.ry lean ——
    let fYaw = 0;
    let fPitch = 0;
    if (looking && !env.reduceMotion && controls.followFactor > 0.001) {
      const z = followZoomScale(controls.mfov, aspect);
      // vtourskin: new_r* = followfactor/zoomscale * followrange * (mouse/stage - 0.5)
      // pointer is already (mouse/stage - 0.5), so range at edges is ±followrange/2… 
      // actually formula multiplies the ±0.5 directly by followrange → ±5° at edges.
      const amp = (controls.followFactor / z) * FOLLOW_RANGE;
      // mouse right → +view.ry; our camera yaw sign matches pano-drag (right lean → look right)
      const targetYaw = -controls.pointer.x * amp;
      const targetPitch = -controls.pointer.y * amp;
      followYaw.current += (targetYaw - followYaw.current) * FOLLOW_SPEED;
      followPitch.current += (targetPitch - followPitch.current) * FOLLOW_SPEED;
      fYaw = followYaw.current;
      fPitch = followPitch.current;
    } else {
      followYaw.current *= 1 - FOLLOW_SPEED;
      followPitch.current *= 1 - FOLLOW_SPEED;
      fYaw = followYaw.current;
      fPitch = followPitch.current;
    }

    env.look.x = yaw.current + fYaw;
    env.look.y = THREE.MathUtils.clamp(pitch.current + fPitch, -maxPitch, maxPitch);

    camera.rotation.order = 'YXZ';
    camera.rotation.y = env.look.x;
    camera.rotation.x = env.look.y;
    camera.rotation.z = 0;
    camera.position.set(0, 0, 0);
  }, -1);

  return null;
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
  const fisheyeRef = useRef(FISHEYE_INTRO);

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
        fisheyeRef={fisheyeRef}
      />

      <color attach="background" args={['#ebe4d6']} />

      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 96, 64]} />
        <meshBasicMaterial
          map={tex}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          // Lift the illustration toward a flatter cartoon read
          color="#fff6ea"
        />
      </mesh>

      <group>
        {/* Keep beams/flicker subtle — heavy atmospherics fought the cel look */}
        <LightBeams />
        <Flicker />
        {SECTIONS.map((s) => (
          <Hotspot key={s.id} section={s} onOpen={onOpen} controls={controls} debug={debug} />
        ))}
      </group>

      <DustField count={reduceMotion ? 20 : 50} />

      <FisheyePass amountRef={fisheyeRef} />
    </SceneContext.Provider>
  );
}
