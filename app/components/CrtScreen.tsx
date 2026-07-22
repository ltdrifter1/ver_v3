'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVideoTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { SECTION_BY_ID } from '@/app/data/sections';
import { setBgmDucked } from '@/lib/audio';

const origin = new THREE.Vector3(0, 0, 0);
const crt = SECTION_BY_ID['crt-tv'];

/**
 * CRT video plane — balmingtiger TV videoplayer pattern:
 * alpha 0 until Videos is focused; fade in 0.4s; unmute + BGM duck
 * only after lookto completes (`armed`).
 */
export default function CrtScreen({
  activeId,
  armed = false,
}: {
  activeId: string | null;
  /** True after lookto finishes on the CRT (or reduce-motion instant open). */
  armed?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const opacity = useRef({ a: 0 });
  const revealed = useRef(false);
  const playing = activeId === 'crt-tv' && armed;
  const [x, y, z] = useMemo(
    () => uvToSpherical(crt.u, crt.v, SPHERE_RADIUS - 0.8),
    [],
  );

  const texture = useVideoTexture('/videos/crt_loop.mp4', {
    unsuspend: 'canplay',
    muted: true,
    loop: true,
    start: false,
    playsInline: true,
  });

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useEffect(() => {
    const video = texture.image as HTMLVideoElement | undefined;
    if (!video) return;

    setBgmDucked(playing);

    if (playing) {
      if (!revealed.current) {
        revealed.current = true;
        gsap.fromTo(
          opacity.current,
          { a: 0 },
          { a: 1, duration: 0.4, ease: 'power1.inOut', overwrite: true },
        );
      } else {
        gsap.to(opacity.current, { a: 1, duration: 0.4, ease: 'power1.inOut', overwrite: true });
      }
      video.muted = false;
      video.volume = 0;
      const vol = { v: 0 };
      gsap.to(vol, {
        v: 0.55,
        duration: 0.6,
        ease: 'power1.inOut',
        onUpdate: () => {
          video.volume = vol.v;
        },
      });
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    } else {
      gsap.to(opacity.current, {
        a: revealed.current ? 0 : 0,
        duration: 0.35,
        ease: 'power1.inOut',
        overwrite: true,
      });
      video.muted = true;
      video.volume = 0;
      if (video.paused && revealed.current) void video.play().catch(() => {});
    }

    return () => setBgmDucked(false);
  }, [playing, texture]);

  useFrame(() => {
    if (mat.current) mat.current.opacity = opacity.current.a;
  });

  return (
    <mesh ref={mesh} position={[x, y, z]} renderOrder={2}>
      <planeGeometry args={[crt.w * 0.55, crt.h * 0.48]} />
      <meshBasicMaterial
        ref={mat}
        map={texture}
        toneMapped={false}
        side={THREE.DoubleSide}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
