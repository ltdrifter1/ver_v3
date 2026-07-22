'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import Scene from './Scene';
import LoadingGate from './LoadingGate';
import SectionPanel from './SectionPanel';
import FilmFX from './FilmFX';
import TopNav from './TopNav';
import CustomCursor from './CustomCursor';
import MuteControl from './MuteControl';
import { usePanControls } from './usePanControls';
import { SECTION_BY_ID } from '@/app/data/sections';
import { lookToSection, restoreExploreFov } from '@/lib/lookTo';
import { MFOV_EXPLORE } from '@/lib/pano';

export default function Experience() {
  const stageRef = useRef<HTMLDivElement>(null);
  const enteredRef = useRef({ value: false });
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
    lookEnabledRef.current = false;
    liveRef.current.value = false;
    enteredRef.current.value = true;
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

  useEffect(() => {
    if (!canLook) return;
    const dismiss = () => setShowCompass(false);
    const id = setTimeout(dismiss, 8000);
    window.addEventListener('pointerdown', dismiss, { once: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener('pointerdown', dismiss);
    };
  }, [canLook]);

  const openedAt = useRef(0);

  const open = useCallback(
    (id: string) => {
      if (!lookEnabledRef.current || controls.lookAnimating) return;

      // Toggle close — restore explore FOV like leaving a focused hotspot
      if (active === id) {
        panelOpenRef.current.value = false;
        setActive(null);
        if (!reduceMotion) restoreExploreFov(controls, 1.2);
        else controls.mfov = MFOV_EXPLORE;
        return;
      }

      const section = SECTION_BY_ID[id];
      if (!section) return;

      openedAt.current = Date.now();
      // balmingtiger: lookto + openPanel in parallel (panel while camera flies)
      panelOpenRef.current.value = true;
      setActive(id);
      setShowCompass(false);

      if (reduceMotion) {
        controls.lookTarget.x = (section.u - 0.5) * Math.PI * 2;
        controls.lookTarget.y = (0.5 - section.v) * Math.PI;
        controls.mfov = section.lookFov;
        return;
      }
      lookToSection(controls, section, { duration: 2 });
    },
    [active, controls, reduceMotion],
  );

  const close = useCallback(() => {
    if (Date.now() - openedAt.current < 350) return;
    panelOpenRef.current.value = false;
    setActive(null);
    if (!reduceMotion) restoreExploreFov(controls, 1.2);
  }, [controls, reduceMotion]);

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
          gl.setClearColor('#ebe4d6', 1);
          camera.rotation.order = 'YXZ';
        }}
      >
        <Suspense fallback={null}>
          <Scene
            controls={controls}
            reduceMotion={reduceMotion}
            enteredRef={enteredRef.current}
            liveRef={liveRef.current}
            panelOpenRef={panelOpenRef.current}
            onOpen={open}
            onIntroComplete={handleIntroComplete}
            debug={debug}
          />
        </Suspense>
      </Canvas>

      <FilmFX />
      <CustomCursor enabled={canLook} />
      <MuteControl visible={canLook} />
      <TopNav visible={canLook} activeId={active} onOpen={open} />

      {live && (
        <div className="compass" style={{ opacity: showCompass ? 1 : 0 }}>
          Click & drag to look around
        </div>
      )}

      <SectionPanel activeId={active} onClose={close} />
      <LoadingGate onEntered={handleEntered} />
    </div>
  );
}
