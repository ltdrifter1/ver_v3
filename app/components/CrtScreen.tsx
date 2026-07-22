'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { SECTION_BY_ID } from '@/app/data/sections';
import { setBgmDucked } from '@/lib/audio';

const origin = new THREE.Vector3(0, 0, 0);
const crt = SECTION_BY_ID['crt-tv'];

/**
 * Video plane welded to the CRT hotspot — balmingtiger TV videoplayer pattern.
 * Plays when Videos is focused; otherwise sits quiet / dim.
 */
export default function CrtScreen({ activeId }: { activeId: string | null }) {
  const mesh = useRef<THREE.Mesh>(null);
  const playing = activeId === 'crt-tv';
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
      video.muted = false;
      video.volume = 0.55;
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    } else {
      video.muted = true;
      video.volume = 0;
      // keep a quiet loop so the screen isn't black when glanced at
      if (video.paused) void video.play().catch(() => {});
    }

    return () => setBgmDucked(false);
  }, [playing, texture]);

  return (
    <mesh ref={mesh} position={[x, y, z]} renderOrder={2}>
      <planeGeometry args={[crt.w * 0.55, crt.h * 0.48]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        side={THREE.DoubleSide}
        transparent
        opacity={playing ? 1 : 0.55}
        depthWrite={false}
      />
    </mesh>
  );
}
