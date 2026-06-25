'use client';

import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import gsap from 'gsap';

/**
 * The entry gate. Doubles as the asset-streaming UI (progress is driven by the
 * three.js loading manager) and the threshold ritual: clicking ENTER parts the
 * shutters and reveals the room beneath.
 */
export default function LoadingGate({ onEntered }: { onEntered: () => void }) {
  const { progress, active } = useProgress();
  const [ready, setReady] = useState(false);
  const [pct, setPct] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const enterBtn = useRef<HTMLButtonElement>(null);
  const shutterL = useRef<HTMLSpanElement>(null);
  const shutterR = useRef<HTMLSpanElement>(null);
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
      const wait = Math.max(0, 700 - elapsed);
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
    const tl = gsap.timeline({
      onComplete: () => {
        if (root.current) root.current.style.display = 'none';
      },
    });
    tl.to(inner.current, { opacity: 0, y: -14, duration: 0.5, ease: 'power2.in' })
      // let the room become interactive as the shutters begin to part
      .add(() => onEntered(), '-=0.05')
      .to(shutterL.current, { xPercent: -101, duration: 1.25, ease: 'power3.inOut' }, '<')
      .to(shutterR.current, { xPercent: 101, duration: 1.25, ease: 'power3.inOut' }, '<')
      .to(root.current, { opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.5');
  };

  return (
    <>
      <div className="shutter" aria-hidden>
        <span className="l" ref={shutterL} />
        <span className="r" ref={shutterR} />
      </div>

      <div className="gate" ref={root} role="dialog" aria-label="Enter VCR Records">
        <div className="gate-grain" aria-hidden />
        <div className="gate-inner" ref={inner}>
          <h1 className="gate-mark gate-flicker">
            VCR
            <span className="reel">RECORDS</span>
          </h1>
          <p className="gate-sub">Video Cassette Recordings · Est. 1993</p>

          <div className="gate-bar" aria-hidden>
            <i ref={bar} />
          </div>
          <div className="gate-status">
            <span>{ready ? 'Room warmed' : 'Cueing the room'}</span>
            <span>{pct}%</span>
          </div>

          <button
            type="button"
            className="gate-enter"
            ref={enterBtn}
            onClick={enter}
            disabled={!ready}
          >
            {ready ? 'Step Inside' : 'Loading…'}
          </button>
        </div>
      </div>
    </>
  );
}
