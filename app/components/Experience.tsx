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
import GyroButton, { createGyro } from './GyroButton';
import { usePanControls } from './usePanControls';
import { SECTION_BY_ID, SHOP_URL } from '@/app/data/sections';
import { lookToSection, resetCamera, restoreExploreFov } from '@/lib/lookTo';
import { MFOV_EXPLORE, START_LOOK_U, START_LOOK_V, uToYaw, vToPitch } from '@/lib/pano';
import { playSfx, unlockAudio } from '@/lib/audio';

const TWO_PI = Math.PI * 2;

function yawDelta(from: number, to: number) {
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

/**
 * balmingtiger focus model:
 *   lookto → glow latches (hoverOut no-op while active_scene matches)
 *   drag-away / zoom-away → free (glow out, explore FOV)
 *   explicit close → resetCamera to front
 */
export default function Experience() {
  const stageRef = useRef<HTMLDivElement>(null);
  const enteredRef = useRef({ value: false });
  const lookEnabledRef = useRef(false);
  const liveRef = useRef({ value: false });
  const panelOpenRef = useRef({ value: false });
  const gyroRef = useRef(createGyro());
  const onDragEndRef = useRef<(() => void) | null>(null);
  const activeRef = useRef<string | null>(null);
  const focusedRef = useRef<string | null>(null);
  /** Ignore zoom-away until lookto has landed. */
  const focusReadyAt = useRef(0);

  const [active, setActive] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [crtArmed, setCrtArmed] = useState(false);
  const [live, setLive] = useState(false);
  const [canLook, setCanLook] = useState(false);
  const [showCompass, setShowCompass] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [maxDpr, setMaxDpr] = useState(2);
  const [debug, setDebug] = useState(false);
  const [lightsOn, setLightsOn] = useState(true);

  const controls = usePanControls(stageRef, lookEnabledRef, onDragEndRef);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    focusedRef.current = focusedId;
  }, [focusedId]);

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
    void unlockAudio();
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

  const snapFront = useCallback(() => {
    controls.lookTarget.x = uToYaw(START_LOOK_U);
    controls.lookTarget.y = vToPitch(START_LOOK_V);
    controls.mfov = MFOV_EXPLORE;
    controls.velocity.x = 0;
    controls.velocity.y = 0;
  }, [controls]);

  /** Explicit close (Esc / scrim / nav toggle) — BT resetCamera to front. */
  const close = useCallback(
    (opts?: { force?: boolean; silent?: boolean }) => {
      if (!panelOpenRef.current.value && !focusedRef.current) return;
      if (!opts?.force && Date.now() - openedAt.current < 350) return;
      panelOpenRef.current.value = false;
      setActive(null);
      setFocusedId(null);
      focusedRef.current = null;
      setCrtArmed(false);
      if (!opts?.silent) playSfx('click');
      if (!reduceMotion) resetCamera(controls, 2);
      else snapFront();
    },
    [controls, reduceMotion, snapFront],
  );

  /**
   * Free focus after the user zooms / pans away from the locked hotspot.
   * Keeps current look; restores explore FOV; clears glow latch.
   */
  const freeFocus = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!focusedRef.current) return;
      panelOpenRef.current.value = false;
      setActive(null);
      setFocusedId(null);
      focusedRef.current = null;
      setCrtArmed(false);
      if (!opts?.silent) playSfx('click');
      if (!reduceMotion) restoreExploreFov(controls, 1.2);
      else controls.mfov = MFOV_EXPLORE;
    },
    [controls, reduceMotion],
  );

  // Zoom / pan away while locked → free (listening booth + cash register first)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const id = focusedRef.current;
      if (
        id &&
        lookEnabledRef.current &&
        !controls.lookAnimating &&
        Date.now() > focusReadyAt.current
      ) {
        const section = SECTION_BY_ID[id];
        if (section) {
          const targetYaw = uToYaw(section.lookU ?? section.u);
          const targetPitch = vToPitch(section.lookV ?? section.v);
          const ang = Math.hypot(
            yawDelta(controls.lookTarget.x, targetYaw),
            controls.lookTarget.y - targetPitch,
          );
          const zoomedOut = controls.mfov > section.lookFov + 28;
          const pannedAway = ang > 0.48; // ≈ 27°
          if (zoomedOut || pannedAway) {
            freeFocus({ silent: true });
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controls, freeFocus]);

  // balmingtiger: drag-end exits primarily in video mode
  useEffect(() => {
    onDragEndRef.current = () => {
      if (activeRef.current === 'crt-tv') close({ force: true });
    };
    return () => {
      onDragEndRef.current = null;
    };
  }, [close]);

  const open = useCallback(
    (id: string) => {
      if (!lookEnabledRef.current || controls.lookAnimating) return;

      // Toggle off if same focused feature re-clicked via nav
      if (focusedRef.current === id && (active === id || id === 'cash-register')) {
        close({ force: true });
        return;
      }

      const section = SECTION_BY_ID[id];
      if (!section) return;

      openedAt.current = Date.now();
      setShowCompass(false);
      setCrtArmed(false);

      // —— Shop / cash register: lookto + glow latch + outbound (no panel) ——
      if (id === 'cash-register') {
        playSfx('shop');
        panelOpenRef.current.value = false;
        setActive(null);
        setFocusedId(id);
        focusedRef.current = id;
        focusReadyAt.current = Date.now() + (reduceMotion ? 0 : 2100);

        if (reduceMotion) {
          controls.lookTarget.x = uToYaw(section.lookU ?? section.u);
          controls.lookTarget.y = vToPitch(section.lookV ?? section.v);
          controls.mfov = section.lookFov;
        } else {
          lookToSection(controls, section, { duration: 2 });
        }
        window.open(SHOP_URL, '_blank', 'noopener,noreferrer');
        return;
      }

      // —— Listening booth (+ other panels): lookto + glow latch + panel ——
      panelOpenRef.current.value = true;
      setActive(id);
      setFocusedId(id);
      focusedRef.current = id;
      focusReadyAt.current = Date.now() + (reduceMotion ? 0 : 2100);
      playSfx(section.sfx || 'focus');

      if (reduceMotion) {
        controls.lookTarget.x = uToYaw(section.lookU ?? section.u);
        controls.lookTarget.y = vToPitch(section.lookV ?? section.v);
        controls.mfov = section.lookFov;
        if (id === 'crt-tv') setCrtArmed(true);
        return;
      }
      lookToSection(controls, section, {
        duration: 2,
        onComplete: () => {
          if (id === 'crt-tv') setCrtArmed(true);
        },
      });
    },
    [active, close, controls, reduceMotion],
  );

  const toggleLights = useCallback(() => {
    setLightsOn((v) => !v);
    playSfx('lights');
  }, []);

  const videoFocused = active === 'crt-tv';

  return (
    <div className={`stage${canLook ? ' can-look' : ''}`} ref={stageRef}>
      <Canvas
        dpr={[1, maxDpr]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
        }}
        camera={{ fov: 100, position: [0, 0, 0], near: 0.1, far: 200 }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor('#000000', 1);
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
            lightsOn={lightsOn}
            onToggleLights={toggleLights}
            activeId={active}
            focusedId={focusedId}
            crtArmed={crtArmed}
            gyroRef={gyroRef}
          />
        </Suspense>
      </Canvas>

      <FilmFX />
      <CustomCursor enabled={canLook} />
      <MuteControl visible={canLook} unlocked={live} faded={videoFocused} />
      <GyroButton visible={canLook} gyroRef={gyroRef} />
      <TopNav visible={canLook} activeId={active} onOpen={open} />

      {live && (
        <div className="compass" style={{ opacity: showCompass ? 1 : 0 }}>
          Click & drag to look around
        </div>
      )}

      <SectionPanel activeId={active} onClose={() => close()} />
      <LoadingGate onEntered={handleEntered} />
    </div>
  );
}
