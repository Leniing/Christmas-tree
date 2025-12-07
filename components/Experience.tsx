import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

import { InteractionState } from '../types';
import { InstancedShape } from './InstancedShape';
import { TreeTopper } from './TreeTopper';
import { SnowSystem } from './SnowSystem';

// Colors
const SPHERE_COLORS = ['#FFD700', '#FFD700', '#D4AF37', '#C41E3A', '#8B0000']; // Gold & Red
const CUBE_COLORS = ['#FFD700', '#D4AF37', '#006400', '#228B22', '#013220']; // Gold & Green

export const Experience: React.FC<{
  mode: InteractionState;
  setMode: (m: InteractionState) => void;
}> = ({ mode, setMode }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Reset camera to front view when returning to Tree mode
  useEffect(() => {
    if (mode === InteractionState.Tree && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [mode]);

  // Interaction Logic
  const handleClick = (e: any) => {
    // Only trigger if click wasn't a drag (delta < 5 pixels)
    if (e.delta < 5) {
      // Toggle between Tree (0) and Exploded (1)
      setMode(mode === InteractionState.Tree ? InteractionState.Exploded : InteractionState.Tree);
    }
  };

  // Split points for spheres and cubes
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
        autoRotate={mode === InteractionState.Tree} // Auto rotate only in tree mode
        autoRotateSpeed={1.0}
        // Limit vertical angle to 90 degrees (horizon) to prevent going below the tree
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
        
        {/* HitBox: Large invisible sphere to capture clicks in empty space */}
        {/* Radius 60 ensures it encloses the camera (maxDist 40) and scene */}
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
      
      {/* Environment Map for PBR Reflections */}
      <Environment preset="city" />
    </>
  );
};
