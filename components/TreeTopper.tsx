import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { InteractionState } from '../types';

interface TreeTopperProps {
  mode: InteractionState;
}

export const TreeTopper: React.FC<TreeTopperProps> = ({ mode }) => {
  const ref = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Generate a Rounded/Cute Star Shape
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    // Reduced size: 1.0 -> 0.65
    const outerRadius = 0.65;
    const innerRadius = 0.35;
    
    const getPos = (angle: number, radius: number) => ({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    });

    const startAngle = Math.PI / 2; // Point up
    const { x: sx, y: sy } = getPos(startAngle, outerRadius);
    shape.moveTo(sx, sy);

    const angleStep = (Math.PI * 2) / points;

    for (let i = 0; i < points; i++) {
      const currentTipAngle = startAngle + i * angleStep;
      const nextTipAngle = startAngle + (i + 1) * angleStep;
      const valleyAngle = currentTipAngle + angleStep / 2;

      // Valley Point
      const { x: vx, y: vy } = getPos(valleyAngle, innerRadius);
      
      // Next Tip Point
      const { x: ntx, y: nty } = getPos(nextTipAngle, outerRadius);

      // Use quadratic curves to make the arms "puffy" (convex)
      // Control points slightly further out than a straight line
      const cpRadius = (outerRadius + innerRadius) / 2 * 0.95; // Slightly puffier
      
      const cp1Angle = currentTipAngle + angleStep * 0.2;
      const { x: c1x, y: c1y } = getPos(cp1Angle, cpRadius);
      
      // Curve from Tip to Valley
      shape.quadraticCurveTo(c1x, c1y, vx, vy);
      
      const cp2Angle = valleyAngle + angleStep * 0.3;
      const { x: c2x, y: c2y } = getPos(cp2Angle, cpRadius);
      
      // Curve from Valley to Next Tip
      shape.quadraticCurveTo(c2x, c2y, ntx, nty);
    }
    
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.3, // Slightly thinner for the smaller size
    bevelEnabled: true,
    bevelThickness: 0.15, // Adds 3D roundness
    bevelSize: 0.1,      // Expands the shape to round off corners
    bevelSegments: 12     // Very smooth edges
  }), []);

  useFrame((state) => {
    if (ref.current && lightRef.current) {
      const time = state.clock.elapsedTime;
      
      // Rotation:
      // Gentle wobble (local Z axis) for "cute" effect, kept minimal
      ref.current.rotation.z = Math.sin(time * 2) * 0.1;
      ref.current.rotation.x = Math.cos(time * 1.5) * 0.05;

      // Bob up and down gently
      const hover = Math.sin(time * 2) * 0.15;
      
      // Position logic: If exploded, shoot up, else stay at top of tree
      // Adjusted base height since star is smaller (was 5.8)
      const targetY = mode === InteractionState.Exploded ? 20 : 5.6 + hover;
      
      // Lerp position
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, 0.05);
      
      // Light intensity pulse
      // Increased brightness as per previous request context, while maintaining transparency
      lightRef.current.intensity = 4.0 + Math.sin(time * 3) * 1.5;
    }
  });

  return (
    <group>
      <mesh ref={ref} position={[0, 5.6, 0]}>
        <extrudeGeometry args={[starShape, extrudeSettings]} />
        
        {/* Crystal/Glass Material: High transmission, clear coat */}
        <meshPhysicalMaterial 
          color="#FFD700" 
          emissive="#FFAA00"
          emissiveIntensity={0.5} // Reduced surface emission to allow transparency to show
          roughness={0.05}        // Smooth glass
          metalness={0.1}       
          transmission={0.95}     // Very transparent (Glass-like)
          thickness={2.0}         // Refraction volume
          ior={1.5}             
          clearcoat={1.0}       
          clearcoatRoughness={0.05}
          attenuationTint="#FFD700"
          attenuationDistance={1.0}
        />
        
        {/* Edges to make outline obvious */}
        <Edges 
          threshold={15} 
          color="#FFFFE0" 
          renderOrder={1000} // Ensure it renders on top if needed
        />
      </mesh>
      
      {/* Internal glow light */}
      <pointLight ref={lightRef} position={[0, 5.6, 0]} color="#FFD700" distance={15} decay={2} />
    </group>
  );
};
