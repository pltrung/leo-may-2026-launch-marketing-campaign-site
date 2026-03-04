"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uScroll;
uniform vec3 uCloudTint;
uniform vec3 uFogTint;
uniform float uCloudStrength;
uniform float uQuality;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  float f = 1.0;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p * f);
    f *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= 1.5;
  vec2 q = vec2(
    uv.x * 1.2 + uTime * 0.03 + uScroll * 0.1,
    uv.y * 1.0 + uTime * 0.02
  );
  float n = fbm(q);
  float cloud = smoothstep(0.45, 0.6, n) * uCloudStrength * uQuality;
  vec3 col = mix(uFogTint, uCloudTint, cloud);
  float alpha = 0.92 + cloud * 0.08;
  gl_FragColor = vec4(col, alpha);
}
`;

const LERP_ATMOSPHERE = 0.04;

interface CloudAtmosphereProps {
  uTime: number;
  uScroll: number;
  cloudTint: [number, number, number];
  fogTint: [number, number, number];
  cloudStrength: number;
  quality: number;
  /** When set, uniforms lerp toward these over ~900ms */
  targetCloudTint?: [number, number, number] | null;
  targetCloudStrength?: number | null;
}

export default function CloudAtmosphere({
  uTime,
  uScroll,
  cloudTint,
  fogTint,
  cloudStrength,
  quality,
  targetCloudTint,
  targetCloudStrength,
}: CloudAtmosphereProps) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uCloudTint: { value: new THREE.Vector3(...cloudTint) },
      uFogTint: { value: new THREE.Vector3(...fogTint) },
      uCloudStrength: { value: cloudStrength },
      uQuality: { value: quality },
    }),
    []
  );

  const targetTintRef = useRef(new THREE.Vector3(cloudTint[0], cloudTint[1], cloudTint[2]));
  const currentStrengthRef = useRef(cloudStrength);

  useEffect(() => {
    uniforms.uTime.value = uTime;
    uniforms.uScroll.value = uScroll;
    if (targetCloudTint) {
      targetTintRef.current.set(targetCloudTint[0], targetCloudTint[1], targetCloudTint[2]);
    } else {
      targetTintRef.current.set(cloudTint[0], cloudTint[1], cloudTint[2]);
    }
    uniforms.uFogTint.value.set(fogTint[0], fogTint[1], fogTint[2]);
    uniforms.uQuality.value = quality;
  }, [uTime, uScroll, cloudTint, fogTint, cloudStrength, quality, targetCloudTint, uniforms]);

  useFrame(() => {
    uniforms.uCloudTint.value.lerp(targetTintRef.current, LERP_ATMOSPHERE);
    const targetStr = targetCloudStrength ?? cloudStrength;
    currentStrengthRef.current = THREE.MathUtils.lerp(
      currentStrengthRef.current,
      targetStr,
      LERP_ATMOSPHERE
    );
    uniforms.uCloudStrength.value = currentStrengthRef.current;
  });

  return (
    <mesh position={[0, 0, -4]} scale={[20, 20, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
