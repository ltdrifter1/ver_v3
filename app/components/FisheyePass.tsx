'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

/**
 * krpano-style view.fisheye.
 *
 * Renders slightly wider than the base FOV, then shows nearly that full
 * wide frame with mild barrel curvature — so explore stays ZOOMED OUT
 * (floor + ceiling + side walls), matching balmingtiger after intro.
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
            float r2 = dot(p, p);
            // Barrel curve only — do NOT shrink toward centre (that zoomed us in).
            float radial = 1.0 + k * 0.22 * r2;
            // Slight overall shrink so barrel edges stay inside the wide FBO
            float fit = 1.0 / (1.0 + k * 0.22);
            vec2 q = p * radial * fit;

            q.x = clamp(q.x, -uAspect * 0.995, uAspect * 0.995);
            q.y = clamp(q.y, -0.995, 0.995);
            q.x /= uAspect;
            vec2 uv = q * 0.5 + 0.5;

            vec4 col = texture2D(tDiffuse, uv);
            // Soft cel lift
            col.rgb = pow(max(col.rgb, 0.0), vec3(0.9));
            col.rgb = mix(col.rgb, smoothstep(0.06, 0.94, col.rgb), 0.2);
            col.rgb *= vec3(1.05, 1.03, 0.99);
            gl_FragColor = col;
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
    amountSmooth.current += (amountRef.current - amountSmooth.current) * 0.45;
    const k = Math.max(0, amountSmooth.current);
    const cam = camera as THREE.PerspectiveCamera;
    const baseFov = cam.fov;

    // Extra width for curved edges + intro punch. Explore k=0.3 → ~12% wider.
    const expand = 1 + k * 0.4;

    if (k < 0.008) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    cam.fov = Math.min(170, baseFov * expand);
    cam.updateProjectionMatrix();

    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(scene, camera);

    cam.fov = baseFov;
    cam.updateProjectionMatrix();

    material.uniforms.tDiffuse.value = fbo.texture;
    material.uniforms.uAmount.value = k;

    gl.setRenderTarget(null);
    gl.render(outScene, outCam);
  }, 1);

  return null;
}
