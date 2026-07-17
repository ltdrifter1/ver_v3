'use client';

import { useMemo } from 'react';
import { makeDotTexture } from '@/lib/sprites';
import { AdditiveQuad } from './LightBeams';

/**
 * Signage that breathes and stutters — welded to equirect (u,v) on the sphere
 * so each accent stays registered as you look around the room.
 */
export default function Flicker() {
  const glow = useMemo(() => makeDotTexture('#ffffff'), []);

  return (
    <group>
      <AdditiveQuad u={0.5} v={0.28} w={3.2} h={3.2} tex={glow} color="#ff8a1e" base={0.42} flickerSpeed={2.4} flickerAmount={0.22} spike />
      <AdditiveQuad u={0.55} v={0.36} w={2.2} h={1.1} tex={glow} color="#6dff8a" base={0.38} flickerSpeed={1.6} flickerAmount={0.2} spike />
      <AdditiveQuad u={0.68} v={0.48} w={3.2} h={3} tex={glow} color="#9fd0ff" base={0.28} flickerSpeed={6.0} flickerAmount={0.4} spike />
      <AdditiveQuad u={0.6} v={0.42} w={2.4} h={5.5} tex={glow} color="#ff4a3a" base={0.32} flickerSpeed={1.1} flickerAmount={0.16} />
      <AdditiveQuad u={0.12} v={0.38} w={2.6} h={1.4} tex={glow} color="#ff3b3b" base={0.4} flickerSpeed={2.0} flickerAmount={0.25} spike />
    </group>
  );
}
