'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import {
  DRAG_FRICTION,
  FISHEYE_INTRO,
  FOLLOW_RANGE_DEG,
  FOLLOW_SPEED,
  FRICTION_STOP,
  INTRO_CEILING_V,
  INTRO_SETTLE_ID,
  MFOV_INTRO,
  SPHERE_RADIUS,
  START_LOOK_U,
  TEXTURE_OFF_SRC,
  TEXTURE_SRC,
  autoPitchLimit,
  followZoomScale,
  mfovToVerticalFov,
  uToYaw,
  vToPitch,
} from '@/lib/pano';
import { playEnterIntro } from '@/lib/intro';
import type { GyroHandle } from '@/lib/gyro';
import { SECTIONS, SECTION_BY_ID } from '@/app/data/sections';
import { SceneContext, type SceneEnv, type Controls } from './sceneContext';
import DustField from './DustField';
import Hotspot from './Hotspot';
import LampHotspot from './LampHotspot';
import FisheyePass from './FisheyePass';
import CrtScreen from './CrtScreen';

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
  lightsOn?: boolean;
  onToggleLights?: () => void;
  activeId?: string | null;
  /** Glow latch — stays on while lookto-focused (incl. shop without panel). */
  focusedId?: string | null;
  crtArmed?: boolean;
  gyroRef?: { current: GyroHandle };
};

/**
 * Camera rig — balmingtiger / krpano parity + cinematic enter:
 * - Enter: ceiling → soft yaw pan → settle on listening booth
 *   while MFOV 160→130 + fisheye 1→0.3 (power3.inOut)
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
  gyroRef,
}: {
  controls: Controls;
  env: SceneEnv;
  enteredRef: { value: boolean };
  onIntroComplete?: () => void;
  fisheyeRef: { current: number };
  gyroRef?: { current: GyroHandle };
}) {
  const { camera, size } = useThree();
  const settle = SECTION_BY_ID[INTRO_SETTLE_ID];
  const settleYaw = uToYaw(settle?.u ?? START_LOOK_U);
  const ceilingPitch = vToPitch(INTRO_CEILING_V);
  const yaw = useRef(settleYaw);
  const pitch = useRef(ceilingPitch);
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
    // Pre-enter: aimed at the ceiling so CLICK TO ENTER reveals the drop
    controls.lookTarget.x = settleYaw;
    controls.lookTarget.y = ceilingPitch;
    controls.velocity.x = 0;
    controls.velocity.y = 0;
    controls.mfov = MFOV_INTRO;
    controls.fisheye = FISHEYE_INTRO;
    controls.followFactor = 0;
    controls.userControl = false;
    controls.lookAnimating = false;
    fisheyeRef.current = FISHEYE_INTRO;
    yaw.current = settleYaw;
    pitch.current = ceilingPitch;
    followYaw.current = 0;
    followPitch.current = 0;
    wasEntered.current = false;
    introDone.current = false;
    return () => {
      introTween.current?.kill();
    };
  }, [camera, controls, settleYaw, ceilingPitch, fisheyeRef]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const dt = Math.min(0.05, delta);

    // —— Intro: ceiling → pan → settle on hotspot ——
    if (enteredRef.value && !wasEntered.current) {
      wasEntered.current = true;
      introTween.current?.kill();
      introTween.current = playEnterIntro(
        controls,
        { yaw, pitch, fisheye: fisheyeRef },
        {
          reduceMotion: env.reduceMotion,
          onComplete: () => {
            introDone.current = true;
            onIntroCompleteRef.current?.();
          },
        },
      );
    }

    cam.fov = mfovToVerticalFov(controls.mfov, aspect);
    cam.updateProjectionMatrix();

    const looking = introDone.current;
    const maxPitch = autoPitchLimit(controls.mfov, aspect);

    if (!looking) {
      // Intro owns lookTarget / yaw / pitch via playEnterIntro onUpdate
      yaw.current = controls.lookTarget.x;
      pitch.current = controls.lookTarget.y;
    } else {
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
      const amp = (controls.followFactor / z) * FOLLOW_RANGE;
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

    // Mobile gyro offset (krpano gyro plugin) — skipped while dragging
    let gYaw = 0;
    let gPitch = 0;
    const gyro = gyroRef?.current;
    if (looking && gyro?.enabled && !controls.dragging && !controls.lookAnimating) {
      gYaw = gyro.yaw;
      gPitch = gyro.pitch;
    }

    env.look.x = yaw.current + fYaw + gYaw;
    env.look.y = THREE.MathUtils.clamp(
      pitch.current + fPitch + gPitch,
      -maxPitch,
      maxPitch,
    );

    camera.rotation.order = 'YXZ';
    camera.rotation.y = env.look.x;
    camera.rotation.x = env.look.y;
    camera.rotation.z = 0;
    camera.position.set(0, 0, 0);
  }, -1);

  return null;
}

function prepTex(tex: THREE.Texture, gl: THREE.WebGLRenderer) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  // BackSide equirect sphere mirrors U — flip so poster/sign text reads LTR.
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.offset.x = 1;
  tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
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
  lightsOn = true,
  onToggleLights,
  activeId = null,
  focusedId = null,
  crtArmed = false,
  gyroRef,
}: Props) {
  const [texOn, texOff] = useTexture([TEXTURE_SRC, TEXTURE_OFF_SRC]);
  const { gl } = useThree();
  const fisheyeRef = useRef(FISHEYE_INTRO);
  const lightsBlend = useRef({ v: lightsOn ? 1 : 0 });
  const matOn = useRef<THREE.MeshBasicMaterial>(null);
  const matOff = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    prepTex(texOn, gl);
    prepTex(texOff, gl);
  }, [texOn, texOff, gl]);

  useEffect(() => {
    gsap.to(lightsBlend.current, {
      v: lightsOn ? 1 : 0,
      duration: 0.85,
      ease: 'power2.inOut',
      overwrite: true,
    });
  }, [lightsOn]);

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

  useFrame(() => {
    const on = lightsBlend.current.v;
    if (matOn.current) matOn.current.opacity = on;
    if (matOff.current) matOff.current.opacity = 1 - on;
  });

  return (
    <SceneContext.Provider value={env}>
      <Rig
        controls={controls}
        env={env}
        enteredRef={enteredRef}
        onIntroComplete={onIntroComplete}
        fisheyeRef={fisheyeRef}
        gyroRef={gyroRef}
      />

      <color attach="background" args={['#000000']} />

      {/* Lights-on sphere */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 96, 64]} />
        <meshBasicMaterial
          ref={matOn}
          map={texOn}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          opacity={1}
          color="#ffffff"
        />
      </mesh>

      {/* Lights-off sphere (crossfades) */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.02, 96, 64]} />
        <meshBasicMaterial
          ref={matOff}
          map={texOff}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          opacity={0}
          color="#ffffff"
        />
      </mesh>

      <group>
        <CrtScreen activeId={activeId} armed={crtArmed} />
        {SECTIONS.map((s) => (
          <Hotspot
            key={s.id}
            section={s}
            onOpen={onOpen}
            controls={controls}
            focusedId={focusedId}
            debug={debug}
          />
        ))}
        {onToggleLights && (
          <LampHotspot controls={controls} lightsOn={lightsOn} onToggle={onToggleLights} />
        )}
      </group>

      {/* Tiny floating flecks only — cel rooms don't want tungsten beams/dust storms */}
      <DustField count={reduceMotion ? 0 : 12} />

      <FisheyePass amountRef={fisheyeRef} />
    </SceneContext.Provider>
  );
}
