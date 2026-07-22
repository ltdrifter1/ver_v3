'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  attachGyro,
  createGyro,
  isGyroLikelyAvailable,
  requestGyroPermission,
  type GyroHandle,
} from '@/lib/gyro';

/**
 * Mobile gyro enable — balmingtiger `gyro="true"` skin setting.
 * Hidden on desktop / when orientation API missing.
 */
export default function GyroButton({
  visible,
  gyroRef,
}: {
  visible: boolean;
  gyroRef: React.MutableRefObject<GyroHandle>;
}) {
  const [show, setShow] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    setShow(visible && isGyroLikelyAvailable());
  }, [visible]);

  useEffect(() => {
    if (!on) return;
    const detach = attachGyro(gyroRef.current);
    gyroRef.current.enabled = true;
    return () => {
      detach();
      gyroRef.current.enabled = false;
      gyroRef.current.yaw = 0;
      gyroRef.current.pitch = 0;
    };
  }, [on, gyroRef]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (on) {
      setOn(false);
      return;
    }
    const ok = await requestGyroPermission();
    if (ok) setOn(true);
  }, [on]);

  if (!show) return null;

  return (
    <button
      type="button"
      className={`gyro-control${on ? ' is-on' : ''}`}
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-pressed={on}
      aria-label={on ? 'Disable gyro' : 'Enable gyro'}
      data-cursor="click"
    >
      {on ? 'GYRO ON' : 'GYRO'}
    </button>
  );
}

export { createGyro };
