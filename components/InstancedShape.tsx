import React, { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { InteractionState } from '../types';

interface InstancedShapeProps {
  type: 'sphere' | 'cube';
  count: number;
  mode: InteractionState;
  colors: string[];
}

export const InstancedShape: React.FC<InstancedShapeProps> = ({ type, count, mode, colors }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // -- 1. Generate Target Positions for each State --
  const targets = useMemo(() => {
    const tree = new Float32Array(count * 3);
    const explode = new Float32Array(count * 3);
    const colorArray = new Float32Array(count * 3);

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // A. Tree Formation (Spiral Cone)
      // Height goes from -5 to 5 roughly
      const y = (i / count) * 10 - 5; 
      // Radius gets smaller as y gets higher. 
      // Base radius ~3.5 at bottom, 0 at top.
      const level = (y + 5) / 10; // 0 to 1
      const radius = 3.5 * (1 - level) + 0.2; // Cone shape
      // Golden Angle for distribution
      const theta = i * 2.39996; // Golden angle in radians
      
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);

      // Add some jitter to make it look organic
      const jitter = 0.3;
      tree[i * 3] = x + (Math.random() - 0.5) * jitter;
      tree[i * 3 + 1] = y;
      tree[i * 3 + 2] = z + (Math.random() - 0.5) * jitter;

      // B. Explosion Formation (Sphere shell + random volume)
      const phi = Math.acos(-1 + (2 * i) / count);
      const sqrtPi = Math.sqrt(count * Math.PI) * phi;
      const exRadius = 15 + Math.random() * 10;
      
      explode[i * 3] = exRadius * Math.cos(sqrtPi) * Math.sin(phi);
      explode[i * 3 + 1] = exRadius * Math.sin(sqrtPi) * Math.sin(phi);
      explode[i * 3 + 2] = exRadius * Math.cos(phi);

      // Colors
      const colorHex = colors[Math.floor(Math.random() * colors.length)];
      tempColor.set(colorHex);
      
      // Add slight variation to metal shine
      if (Math.random() > 0.8) tempColor.offsetHSL(0, 0, 0.2); 

      colorArray[i * 3] = tempColor.r;
      colorArray[i * 3 + 1] = tempColor.g;
      colorArray[i * 3 + 2] = tempColor.b;
    }

    return { tree, explode, colorArray };
  }, [count, colors]);

  // -- 2. Initial Setup (Colors) --
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const tempColor = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
      tempColor.setRGB(
        targets.colorArray[i * 3],
        targets.colorArray[i * 3 + 1],
        targets.colorArray[i * 3 + 2]
      );
      meshRef.current.setColorAt(i, tempColor);
      
      // Initialize position at tree state
      dummy.position.set(
        targets.tree[i * 3],
        targets.tree[i * 3 + 1],
        targets.tree[i * 3 + 2]
      );
      dummy.scale.setScalar(0.2 + Math.random() * 0.3);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [count, targets, dummy]);

  // -- 3. Animation Loop --
  // We maintain current positions in a separate Float32Array to handle lerping efficiently
  const currentPositions = useRef(new Float32Array(count * 3));
  // Initialize current positions
  useMemo(() => {
    currentPositions.current.set(targets.tree);
  }, [targets]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Determine target array based on mode
    let targetArray = targets.tree;
    if (mode === InteractionState.Exploded) targetArray = targets.explode;

    const damp = THREE.MathUtils.damp;
    // Speed of transition
    const lambda = 4 * delta; 

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Lerp current position towards target
      // We do manual lerp for performance instead of Vector3.lerp
      const cx = currentPositions.current[ix];
      const cy = currentPositions.current[iy];
      const cz = currentPositions.current[iz];

      const tx = targetArray[ix];
      const ty = targetArray[iy];
      const tz = targetArray[iz];

      // Standard linear interpolation formula: a + (b - a) * t
      // Using a damp factor for smoothness
      const nx = cx + (tx - cx) * lambda;
      const ny = cy + (ty - cy) * lambda;
      const nz = cz + (tz - cz) * lambda;

      // Update stored current position
      currentPositions.current[ix] = nx;
      currentPositions.current[iy] = ny;
      currentPositions.current[iz] = nz;

      // Update Matrix
      dummy.position.set(nx, ny, nz);
      
      // Rotate objects individually for sparkle effect
      // Rotation depends on time + index
      const time = state.clock.elapsedTime;
      dummy.rotation.set(
        time * 0.5 + i,
        time * 0.3 + i,
        time * 0.2 + i
      );
      
      // Scale pulsing slightly
      const scaleBase = type === 'cube' ? 0.3 : 0.25;
      const scalePulse = Math.sin(time * 2 + i) * 0.05;
      dummy.scale.setScalar(scaleBase + scalePulse);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      {/* 
        Low polygon count for geometries because we have thousands of them.
        Spheres don't need to be perfect 32x32 segments.
        Using intrinsic elements instead of THREE classes to avoid constructor errors.
      */}
      {type === 'sphere' ? (
        <sphereGeometry args={[0.5, 16, 16]} />
      ) : (
        <boxGeometry args={[0.8, 0.8, 0.8]} />
      )}
      <meshStandardMaterial 
        metalness={0.9} 
        roughness={0.15} 
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
};