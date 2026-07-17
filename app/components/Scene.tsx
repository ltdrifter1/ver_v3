'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { MAX_PITCH, SPHERE_RADIUS, TEXTURE_SRC } from '@/lib/pano';
import { SECTIONS } from '@/app/data/sections';
import { SceneContext, type SceneEnv, type Controls } from './sceneContext';
import DustField from './DustField';
import LightBeams from './LightBeams';
import Flicker from './Flicker';
import Hotspot from './Hotspot';

const FOV = 68;
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

/** Orbit rig: camera pinned at the origin, yaw/pitch look + subtle breathing. */
function Rig({
  controls,
  env,
}: {
  controls: Controls;
  env: SceneEnv;
}) {
  const { camera } = useThree();
  // Start facing the listening booth / bins (main store wall).
  const START_YAW = (0.74 - 0.5) * Math.PI * 2;
  const yaw = useRef(START_YAW);
  const pitch = useRef(0);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = FOV;
    cam.near = 0.1;
    cam.far = SPHERE_RADIUS * 3;
    cam.position.set(0, 0, 0);
    cam.rotation.order = 'YXZ';
    cam.updateProjectionMatrix();
    controls.lookTarget.x = START_YAW;
    controls.lookTarget.y = 0;
  }, [camera, controls]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;

    const lean = controls.pointer;
    const targetYaw = wrapYaw(controls.lookTarget.x - lean.x * 0.06);
    const targetPitch = THREE.MathUtils.clamp(
      controls.lookTarget.y + lean.y * 0.05,
      -MAX_PITCH,
      MAX_PITCH,
    );
    // keep the mutable target pitch clamped so keyboard/wheel don't run away
    controls.lookTarget.y = targetPitch;

    const k = 1 - Math.pow(0.0014, delta);
    // shortest-path blend for yaw so a full spin never eases the long way
    let dy = targetYaw - yaw.current;
    if (dy > Math.PI) dy -= TWO_PI;
    if (dy < -Math.PI) dy += TWO_PI;
    yaw.current = wrapYaw(yaw.current + dy * k);
    pitch.current += (targetPitch - pitch.current) * k;

    const breathYaw = env.reduceMotion ? 0 : Math.sin(t * 0.11) * 0.008;
    const breathPitch = env.reduceMotion ? 0 : Math.cos(t * 0.09) * 0.006;

    env.look.x = yaw.current + breathYaw;
    env.look.y = pitch.current + breathPitch;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = env.look.x;
    camera.rotation.x = env.look.y;
    if (!env.reduceMotion) {
      camera.rotation.z = Math.sin(t * 0.05) * 0.0035;
      // tiny positional breathing so dust gets real depth parallax
      camera.position.x = Math.sin(t * 0.1) * 0.04;
      camera.position.y = Math.cos(t * 0.083) * 0.03;
    } else {
      camera.rotation.z = 0;
      camera.position.set(0, 0, 0);
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
      <Rig controls={controls} env={env} />

      <color attach="background" args={['#070402']} />

      {/* Inward equirectangular store. Texture is pre-flopped so BackSide reads correctly. */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* accents + hotspots sit just inside the sphere wall */}
      <group>
        <LightBeams />
        <Flicker />
        {SECTIONS.map((s) => (
          <Hotspot key={s.id} section={s} onOpen={onOpen} controls={controls} debug={debug} />
        ))}
      </group>

      {/* dust volume around the eye — world space so turning reveals depth */}
      <DustField count={reduceMotion ? 90 : 240} />
    </SceneContext.Provider>
  );
}
