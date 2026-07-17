'use client';

import { useMemo } from 'react';
import { makeDotTexture } from '@/lib/sprites';
import { AdditiveQuad } from './LightBeams';

/**
 * Signage that breathes and stutters: the neon mask, the EXIT sign, the CRT
 * wash and the glow inside the phone booth. Kept inside the wall layer so each
 * accent stays welded to its illustrated source as the camera pans.
 */
export default function Flicker() {
  const glow = useMemo(() => makeDotTexture('#ffffff'), []);

  return (
    <group>
      {/* orange neon mask, upper-left wall */}
      <AdditiveQuad u={0.275} v={0.115} w={1.5} h={1.5} tex={glow} color="#ff8a1e" base={0.45} flickerSpeed={2.4} flickerAmount={0.22} spike z={0.02} />
      {/* green EXIT sign over the back-room door */}
      <AdditiveQuad u={0.55} v={0.205} w={0.9} h={0.45} tex={glow} color="#6dff8a" base={0.4} flickerSpeed={1.6} flickerAmount={0.2} spike z={0.02} />
      {/* CRT static wash */}
      <AdditiveQuad u={0.225} v={0.43} w={1.5} h={1.4} tex={glow} color="#9fd0ff" base={0.3} flickerSpeed={6.0} flickerAmount={0.4} spike z={0.02} />
      {/* red glow inside the phone booth */}
      <AdditiveQuad u={0.905} v={0.3} w={1.1} h={2.6} tex={glow} color="#ff4a3a" base={0.34} flickerSpeed={1.1} flickerAmount={0.16} z={0.02} />
    </group>
  );
}
