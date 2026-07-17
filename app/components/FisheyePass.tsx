'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Approximate krpano view.fisheye (stereographic blend).
 *
 * balmingtiger keeps fisheye=0.3 in explore and tweens 1.0 → 0.3 on enter.
 * Priority > 0 takes over the R3F render loop: scene → FBO → distorted blit.
 */
export default function FisheyePass({ amountRef }: { amountRef: { current: number } }) {
  const { gl, scene, camera, size } = useThree();
  const fbo = useFBO({ samples: 0, depthBuffer: true });
  const amountSmooth = useRef(0.3);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null as THREE.Texture | null },
          uAmount: { value: 0.3 },
          uAspect: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          uniform float uAmount;
          uniform float uAspect;
          varying vec2 vUv;

          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            p.x *= uAspect;

            float k = clamp(uAmount, 0.0, 1.0);
            // Soft globe at 0.3; strong enter pull at 1.0
            float strength = k * k * 1.35;
            float r2 = dot(p, p);
            vec2 q = p / (1.0 + strength * r2);
            q.x /= uAspect;
            vec2 uv = q * 0.5 + 0.5;

            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
              gl_FragColor = vec4(0.027, 0.016, 0.008, 1.0);
              return;
            }
            gl_FragColor = texture2D(tDiffuse, uv);
          }
        `,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  const quad = useMemo(() => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    return mesh;
  }, [material]);

  const outScene = useMemo(() => {
    const s = new THREE.Scene();
    s.add(quad);
    return s;
  }, [quad]);

  const outCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  useEffect(() => {
    fbo.setSize(size.width, size.height);
    material.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [fbo, material, size.width, size.height]);

  useEffect(
    () => () => {
      material.dispose();
      quad.geometry.dispose();
    },
    [material, quad],
  );

  useFrame(() => {
    amountSmooth.current += (amountRef.current - amountSmooth.current) * 0.4;

    // Negligible distortion → straight scene render (still our responsibility).
    if (amountSmooth.current < 0.008) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(scene, camera);

    material.uniforms.tDiffuse.value = fbo.texture;
    material.uniforms.uAmount.value = amountSmooth.current;

    gl.setRenderTarget(null);
    gl.render(outScene, outCam);
  }, 1);

  return null;
}
