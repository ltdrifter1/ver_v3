'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import Scene from './Scene';
import LoadingGate from './LoadingGate';
import SectionPanel from './SectionPanel';
import FilmFX from './FilmFX';
import { usePanControls } from './usePanControls';

export default function Experience() {
  const stageRef = useRef<HTMLDivElement>(null);
  /** Click-and-drag look — stays false through the intro drop/zoom. */
  const lookEnabledRef = useRef(false);
  const liveRef = useRef({ value: false });
  const panelOpenRef = useRef({ value: false });

  const [active, setActive] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [canLook, setCanLook] = useState(false);
  const [showCompass, setShowCompass] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [maxDpr, setMaxDpr] = useState(2);
  const [debug, setDebug] = useState(false);

  const controls = usePanControls(stageRef, lookEnabledRef);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has('debug'));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    setMaxDpr(isTouch ? 1.6 : 2);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleEntered = useCallback(() => {
    // Room is visible / intro plays, but look + hotspots stay locked until zoom settles.
    lookEnabledRef.current = false;
    liveRef.current.value = false;
    setLive(true);
    setCanLook(false);
    setShowCompass(false);
  }, []);

  const handleIntroComplete = useCallback(() => {
    lookEnabledRef.current = true;
    liveRef.current.value = true;
    setCanLook(true);
    setShowCompass(true);
  }, []);

  // dismiss the explore prompt once the visitor starts dragging
  useEffect(() => {
    if (!canLook) return;
    const dismiss = () => setShowCompass(false);
    const id = setTimeout(dismiss, 7000);
    window.addEventListener('pointerdown', dismiss, { once: true });
    window.addEventListener('keydown', dismiss, { once: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [canLook]);

  const openedAt = useRef(0);

  const open = useCallback((id: string) => {
    // Hotspots stay inert until the intro zoom finishes and drag is unlocked.
    if (!lookEnabledRef.current) return;
    openedAt.current = Date.now();
    panelOpenRef.current.value = true;
    setActive(id);
  }, []);

  const close = useCallback(() => {
    // ignore the trailing pointerup of the opening click landing on the scrim
    if (Date.now() - openedAt.current < 350) return;
    panelOpenRef.current.value = false;
    setActive(null);
  }, []);

  return (
    <div className={`stage${canLook ? ' can-look' : ''}`} ref={stageRef}>
      <Canvas
        dpr={[1, maxDpr]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        camera={{ fov: 100, position: [0, 0, 0], near: 0.1, far: 200 }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor('#070402', 1);
          camera.rotation.order = 'YXZ';
        }}
      >
        <Suspense fallback={null}>
          <Scene
            controls={controls}
            reduceMotion={reduceMotion}
            liveRef={liveRef.current}
            panelOpenRef={panelOpenRef.current}
            onOpen={open}
            onIntroComplete={handleIntroComplete}
            debug={debug}
          />
        </Suspense>
      </Canvas>

      <FilmFX />

      {live && (
        <>
          <div className="brand-stamp">
            <span className="rec" />
            VCR REC · ON AIR
          </div>
          <div className="compass" style={{ opacity: showCompass ? 1 : 0 }}>
            <span className="dot" />
            Click & drag to look around · find what hums
            <span className="dot" />
          </div>
        </>
      )}

      <SectionPanel activeId={active} onClose={close} />

      <LoadingGate onEntered={handleEntered} />
    </div>
  );
}
