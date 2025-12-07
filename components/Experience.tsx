import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

import { InteractionState } from '../types';
import { InstancedShape } from './InstancedShape';
import { TreeTopper } from './TreeTopper';
import { SnowSystem } from './SnowSystem';

// Colors
const SPHERE_COLORS = ['#FFD700', '#FFD700', '#D4AF37', '#C41E3A', '#8B0000']; // Gold & Red
const CUBE_COLORS = ['#FFD700', '#D4AF37', '#006400', '#228B22', '#013220']; // Gold & Green

interface ExperienceProps {
  mode: InteractionState;
  setMode: (m: InteractionState) => void;
  rotationSpeed?: number; // Manual rotation control (-N to +N)
}

export const Experience: React.FC<ExperienceProps> = ({ mode, setMode, rotationSpeed = 0 }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Reset camera to front view when returning to Tree mode
  useEffect(() => {
    if (mode === InteractionState.Tree && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [mode]);

  // Handle Rotation Logic (Smooth Inertia)
  useFrame((state, delta) => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true; 

      let targetSpeed = 0;
      
      // Determine Target Speed
      // If user is actively controlling (speed is significant), override idle
      if (Math.abs(rotationSpeed) > 0.01) {
         // Manual Control
         // Scaling factor for OrbitControls speed
         targetSpeed = rotationSpeed * 8.0; // Increased multiplier for sensitivity
      } else {
         // Idle State
         // Tree Mode: Slow rotate (1.0)
         // Exploded Mode: Stop (0) or very slow drift
         targetSpeed = mode === InteractionState.Tree ? 1.0 : 0.2;
      }

      // Smoothly interpolate current speed to target speed (Inertia)
      // Increased lerp factor from 3.0 to 6.0 for quicker response (less "boat-like" float)
      const currentSpeed = controlsRef.current.autoRotateSpeed || 0;
      controlsRef.current.autoRotateSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, delta * 6.0);
      
      controlsRef.current.update();
    }
  });

  // Interaction Logic
  const handleClick = (e: any) => {
    if (e.delta < 5) {
      setMode(mode === InteractionState.Tree ? InteractionState.Exploded : InteractionState.Tree);
    }
  };

  const sphereCount = 1200;
  const cubeCount = 1800;
  
  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={40}
        // autoRotate props removed here, handled entirely in useFrame for smoothness
        maxPolarAngle={Math.PI / 2}
      />

      <group onClick={handleClick}>
        <InstancedShape 
          type="sphere" 
          count={sphereCount} 
          mode={mode} 
          colors={SPHERE_COLORS}
        />
        <InstancedShape 
          type="cube" 
          count={cubeCount} 
          mode={mode} 
          colors={CUBE_COLORS}
        />
        <TreeTopper mode={mode} />
        
        {/* Snow System */}
        <SnowSystem mode={mode} />
        
        {/* HitBox */}
        <mesh>
          <sphereGeometry args={[60, 16, 16]} />
          <meshBasicMaterial side={THREE.BackSide} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#FFD700" />
      <pointLight position={[-10, 10, -10]} intensity={1.0} color="#ff3333" />
      <pointLight position={[0, -10, 5]} intensity={0.8} color="#ffffff" />
      
      <Environment preset="city" />
    </>
  );
};
