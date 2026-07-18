'use client';

import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  OrbitControls,
  useGLTF,
} from '@react-three/drei';
import type { ViewerBackground } from '@/hooks/use-viewer-config';

interface Product3DCanvasProps {
  modelUrl: string;
  autoRotate: boolean;
  rotateSpeed: number;
  background: ViewerBackground;
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
}

/** Solid canvas colours per preset; gradient/transparent stay see-through. */
const BACKGROUND_COLOR: Partial<Record<ViewerBackground, string>> = {
  'studio-light': '#f4f4f5',
  'dark-luxury': '#0c1013',
};

const ENVIRONMENT_PRESET: Record<ViewerBackground, 'studio' | 'city' | 'apartment'> = {
  'studio-light': 'studio',
  'dark-luxury': 'city',
  gradient: 'apartment',
  transparent: 'studio',
};

/**
 * Normalise any .glb to a predictable size and centre: scaled so its longest
 * diagonal is ~2 world units, sitting on y=0 for the contact shadow.
 */
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const normalized = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const diagonal = box.getSize(new THREE.Vector3()).length() || 1;
    const scale = 2 / diagonal;
    clone.scale.setScalar(scale);
    const scaled = new THREE.Box3().setFromObject(clone);
    const center = scaled.getCenter(new THREE.Vector3());
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= scaled.min.y; // rest on the floor
    return clone;
  }, [scene]);

  return <primitive object={normalized} />;
}

/**
 * The real-3D half of the product viewer. A separate chunk loaded with
 * next/dynamic so three.js never weighs down pages that don't render it.
 */
export default function Product3DCanvas({
  modelUrl,
  autoRotate,
  rotateSpeed,
  background,
  minZoom,
  maxZoom,
  defaultZoom,
}: Product3DCanvasProps) {
  const solid = BACKGROUND_COLOR[background];

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.9, defaultZoom], fov: 35 }}
      gl={{ alpha: !solid, antialias: true }}
      className="h-full w-full"
    >
      {solid ? <color attach="background" args={[solid]} /> : null}
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 4]} intensity={0.8} />
      <Suspense fallback={null}>
        <Model url={modelUrl} />
        <Environment preset={ENVIRONMENT_PRESET[background]} />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={6}
          blur={2.4}
          far={2}
        />
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, 0.6, 0]}
        enablePan={false}
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={rotateSpeed}
        minDistance={minZoom}
        maxDistance={maxZoom}
      />
    </Canvas>
  );
}
