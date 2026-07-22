'use client';

import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import gsap from 'gsap';

/**
 * Entry gate — balmingtiger gold full-bleed + CLICK TO ENTER.
 * Fade out 0.4s (no shutters) then intro FOV/fisheye starts in Scene.
 */
export default function LoadingGate({ onEntered }: { onEntered: () => void }) {
  const { progress, active } = useProgress();
  const [ready, setReady] = useState(false);
  const [pct, setPct] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const enterBtn = useRef<HTMLButtonElement>(null);
  const mounted = useRef(Date.now());

  useEffect(() => {
    const p = Math.round(progress);
    setPct((prev) => (p > prev ? p : prev));
    if (bar.current) {
      gsap.to(bar.current, { scaleX: Math.max(0.02, progress / 100), duration: 0.5, ease: 'power2.out' });
    }
  }, [progress]);

  useEffect(() => {
    const elapsed = Date.now() - mounted.current;
    if (!active && progress >= 100) {
      const wait = Math.max(0, 1000 - elapsed);
      const id = setTimeout(() => setReady(true), wait);
      return () => clearTimeout(id);
    }
  }, [active, progress]);

  useEffect(() => {
    if (ready && enterBtn.current) {
      gsap.to(enterBtn.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
    }
  }, [ready]);

  const enter = () => {
    if (!ready) return;
    gsap.to(root.current, {
      opacity: 0,
      duration: 0.4,
      ease: 'power1.inOut',
      onStart: () => onEntered(),
      onComplete: () => {
        if (root.current) root.current.style.display = 'none';
      },
    });
  };

  return (
    <div className="gate" ref={root} role="dialog" aria-label="Enter VCR Records">
      <div className="gate-inner" ref={inner}>
        <p className="gate-eyebrow">Est. 1993</p>
        <h1 className="gate-mark">
          VCR
          <span className="reel">RECORDS</span>
        </h1>
        <p className="gate-sub">Best experienced with your device&apos;s audio enabled</p>

        <div className="gate-bar" aria-hidden>
          <i ref={bar} />
        </div>
        <div className="gate-status">
          <span>{ready ? 'Ready' : 'Loading'}</span>
          <span>{pct}%</span>
        </div>

        <button
          type="button"
          className="gate-enter"
          ref={enterBtn}
          onClick={enter}
          disabled={!ready}
        >
          {ready ? 'CLICK TO ENTER' : 'LOADING…'}
        </button>
      </div>
    </div>
  );
}
