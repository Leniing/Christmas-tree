import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractionState } from '../types';

// Palette: Classic Christmas Red & Green
const REDS = ['#D40000', '#B22222', '#8B0000'];
const GREENS = ['#006400', '#228B22', '#004d00'];

// Soft Silk Material: Black, Floating, High Sheen
const SILK_MATERIAL = new THREE.MeshPhysicalMaterial({
  color: '#080808',       // Jet Black
  roughness: 0.3,         // Glossy
  metalness: 0.3,
  clearcoat: 0.2,
  sheen: 1.0,
  sheenColor: new THREE.Color('#333'),
  side: THREE.DoubleSide,
});

type RibbonVariant = 'tail' | 'loop';

interface DynamicRibbonProps {
  variant: RibbonVariant;
  offset: number;
  speed: number;
  length: number;
  width: number;
  thickness: number; // New prop for visual thickness offset
}

// A dynamic ribbon component
const DynamicRibbon: React.FC<DynamicRibbonProps> = ({ variant, offset, speed, length, width, thickness }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // High segment count for smooth bending
  const segments = 32; 
  // Use a slightly wider plane to account for twisting
  const geometry = useMemo(() => new THREE.PlaneGeometry(width, length, 1, segments), [width, length]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const posAttribute = meshRef.current.geometry.attributes.position;
    const array = posAttribute.array as Float32Array;
    const normals = meshRef.current.geometry.attributes.normal.array as Float32Array;

    const halfWidth = width / 2;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 to 1 along the ribbon length

      // --- CALCULATE SPINE POSITION (Center of ribbon) ---
      let px = 0, py = 0, pz = 0; // Position
      let tx = 0, ty = 0, tz = 0; // Tangent (Direction)
      let nx = 0, ny = 1, nz = 0; // Normal (Up)

      if (variant === 'loop') {
        // --- HORIZONTAL LOOP MATH ---
        // A teardrop/petal shape lying on the XZ plane
        // Arching up in Y to give volume (puffy)
        
        const angle = t * Math.PI * 2; // 0 to 360
        
        // Loop radius derived from length
        const r = length / 3.2;

        // Shape: 
        // X = extends out and comes back
        // Z = widens out
        // Y = arches up
        
        // Parametric Teardrop in XZ
        // Squeeze start and end to 0,0
        // Bubble out in middle
        const expansion = Math.sin(t * Math.PI); // 0 -> 1 -> 0
        
        px = Math.sin(angle) * r * 1.5; // Circle-ish in X
        pz = (1 - Math.cos(angle)) * r * 0.8; // Offset circle Z
        
        // Flatten the bottom part (near knot) and puff the top part
        // We want the loop to look like it's coming OUT of the knot (0,0,0)
        // Let's use a simpler petal curve
        // x = t * length (linear out)? No, needs to loop back.
        
        // Let's use a bent ellipse
        const petalAngle = t * Math.PI * 2;
        px = Math.sin(petalAngle) * r * 1.2;
        pz = (Math.cos(petalAngle) - 1) * r * 0.5; // Width of loop
        
        // Arch Up (Y axis) - Puffy volume
        // Highest point at t=0.5
        py = Math.sin(t * Math.PI) * (width * 1.5);

        // Animate: Breathe
        const breathe = 1 + Math.sin(time * speed + offset) * 0.05;
        px *= breathe;
        py *= breathe;
        pz *= breathe;

      } else {
        // --- TAIL MATH ---
        // Drapes down over the box edge
        // Starts at 0,0,0
        // Moves Out (X) and Down (Y)
        
        // Natural curve:
        // x moves linearly out
        // y drops exponentially/quadratically
        
        px = t * length * 0.5; // Move out
        py = -Math.pow(t, 2) * length; // Drop down parabolic
        pz = Math.sin(t * Math.PI) * width * 0.2; // Slight S-curve in Z
        
        // Animate: Wind flutter at the tip
        const flutter = Math.sin(time * speed * 2 + t * 5 + offset) * 0.05 * t;
        px += flutter;
        pz += flutter;
      }

      // --- APPLY THICKNESS / OFFSET ---
      // We are manipulating a plane. 
      // Vertices [i*2] is Left, [i*2+1] is Right.
      // We assume the plane width is along Z axis locally before rotation?
      // Standard Plane: Width along X, Length along Y. 
      // But we are manually setting x,y,z.
      
      // Calculate Tangent to determine "Side" vector
      // Simple approximation: direction to next point (or previous)
      // Since we don't have next point easily here without 2 passes, 
      // we assume 'Normal' is roughly Y-up for Loop and Z-out for Tail
      
      // Left side offset
      // For the loop (XZ plane mostly), Width is along Z?
      // Actually we computed px, py, pz. 
      // We need to displace perpendicular to the curve.
      // Let's assume the ribbon is flat relative to the curve surface.
      
      // Simplified Displacement:
      // Loop: Width is mostly in Z (local).
      // Tail: Width is mostly in Z (local).
      
      const vLeft = i * 2 * 3;
      const vRight = (i * 2 + 1) * 3;

      // Local Width Vector (w)
      // For the loop, the ribbon surface is roughly parallel to the "cylinder" of the loop
      // So width is perpendicular to the path.
      
      // Approximation: Just offset Z for width?
      // If the loop is in XY, width is Z.
      // Our loop is 3D.
      
      // Let's just fix the width vector to be "horizontal" relative to the view or knot
      // Z-axis width is safe for X-Y loops. 
      // For our X-Y-Z loops, we rotate the whole group later.
      
      let wx = 0, wy = 0, wz = halfWidth;

      if (variant === 'loop') {
          // Twist the ribbon slightly as it loops
          const twist = t * Math.PI; // 180 twist?
          // actually keep it simple: flat ribbon
      }

      array[vLeft]     = px - wx;
      array[vLeft + 1] = py - wy;
      array[vLeft + 2] = pz - wz;

      array[vRight]     = px + wx;
      array[vRight + 1] = py + wy;
      array[vRight + 2] = pz + wz;
    }
    
    posAttribute.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={SILK_MATERIAL} castShadow />
  );
};

const GiftBox = ({ position, rotation, color, size, mode, index }: any) => {
  const group = useRef<THREE.Group>(null);
  
  const explodeTarget = useMemo(() => {
    const vec = new THREE.Vector3(...position);
    return vec.clone().multiplyScalar(1.5).add(new THREE.Vector3(0, Math.random() * 5, 0));
  }, [position]);

  // Adaptive Dimensions
  const ribbonWidth = size * 0.18; 
  const ribbonLength = size * 1.5; 
  const knotSize = size * 0.22;

  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.elapsedTime;
    
    // Float
    const floatY = Math.sin(time * 1.0 + index) * 0.15;
    
    // Position
    const basePos = new THREE.Vector3(...position);
    const target = mode === InteractionState.Exploded ? explodeTarget : basePos;
    const currentTarget = target.clone();
    currentTarget.y += floatY;
    group.current.position.lerp(currentTarget, 0.05);
    
    // Rotation
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, rotation[0] + Math.sin(time * 0.3 + index) * 0.05, 0.05);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, rotation[2] + Math.cos(time * 0.3 + index) * 0.05, 0.05);
    group.current.rotation.y += 0.005;
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* 1. Gift Box */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.2} 
          roughness={0.2} 
          metalness={0.4} 
        />
      </mesh>
      
      {/* 2. Flat Cross Ribbons (Wrapping the box) */}
      <mesh material={SILK_MATERIAL} receiveShadow>
        <boxGeometry args={[ribbonWidth, size + 0.01, size + 0.01]} />
      </mesh>
      <mesh material={SILK_MATERIAL} receiveShadow>
        <boxGeometry args={[size + 0.01, size + 0.01, ribbonWidth]} />
      </mesh>

      {/* 3. The Bow (Butterfly Knot) */}
      {/* Positioned on TOP of the box */}
      <group position={[0, size / 2, 0]}>
         
         {/* Center Knot: A solid 3D Cube */}
         <mesh material={SILK_MATERIAL} position={[0, knotSize / 2, 0]} castShadow>
           <boxGeometry args={[knotSize, knotSize * 0.8, knotSize]} />
         </mesh>

         {/* -- LOOPS (Horizontal) -- */}
         {/* They branch out Left and Right from the knot */}
         
         {/* Left Loop */}
         <group 
            position={[-knotSize * 0.4, 0, 0]} 
            rotation={[0, 0, Math.PI / 2]} // Base rotation to point sideways
         >
           {/* Inner rotation to lie flat on XZ but puff up in Y */}
           <group rotation={[0, Math.PI / 2, 0]}>
              <DynamicRibbon variant="loop" offset={index} speed={1.5} length={ribbonLength} width={ribbonWidth} thickness={0.02} />
           </group>
         </group>

         {/* Right Loop */}
         <group 
            position={[knotSize * 0.4, 0, 0]} 
            rotation={[0, 0, -Math.PI / 2]}
         >
           <group rotation={[0, Math.PI / 2, 0]}>
              <DynamicRibbon variant="loop" offset={index + 2} speed={1.5} length={ribbonLength} width={ribbonWidth} thickness={0.02} />
           </group>
         </group>


         {/* -- TAILS -- */}
         {/* Draping over the sides */}
         
         {/* Left Tail */}
         <group 
            position={[-knotSize * 0.5, 0, 0]} 
            rotation={[0, 0, 0.2]} // Slight angle out
         >
           <group rotation={[0, Math.PI / 2, 0]}>
            <DynamicRibbon variant="tail" offset={index + 4} speed={1.8} length={ribbonLength * 1.3} width={ribbonWidth} thickness={0.02} />
           </group>
         </group>

         {/* Right Tail */}
         <group 
            position={[knotSize * 0.5, 0, 0]} 
            rotation={[0, 0, -0.2]}
         >
           <group rotation={[0, Math.PI / 2, 0]}>
             <DynamicRibbon variant="tail" offset={index + 6} speed={2.0} length={ribbonLength * 1.3} width={ribbonWidth} thickness={0.02} />
           </group>
         </group>

      </group>
    </group>
  );
};

export const FloatingGifts = ({ mode }: { mode: InteractionState }) => {
  const gifts = useMemo(() => {
    const items: any[] = [];
    const count = 10;
    const minDistance = 3.5; 

    // Balanced Colors
    const colorPool: string[] = [];
    for (let i = 0; i < count / 2; i++) colorPool.push(REDS[i % REDS.length]);
    for (let i = 0; i < count / 2; i++) colorPool.push(GREENS[i % GREENS.length]);
    
    // Shuffle
    for (let i = colorPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
    }

    // Place gifts
    for (let i = 0; i < 100 && items.length < count; i++) {
      let valid = false;
      let attempt = 0;
      let pos = new THREE.Vector3();
      let size = 1.0;

      while (!valid && attempt < 50) {
        const angle = Math.random() * Math.PI * 2;
        const r = 7 + Math.random() * 8; 
        const y = (Math.random() - 0.5) * 8; 
        pos.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        size = 1.0 + Math.random() * 0.8; // Varied sizes 1.0 to 1.8

        valid = true;
        for (const item of items) {
          const dist = pos.distanceTo(new THREE.Vector3(...item.position));
          if (dist < minDistance) {
            valid = false;
            break;
          }
        }
        attempt++;
      }

      if (valid) {
        items.push({
          position: [pos.x, pos.y, pos.z],
          rotation: [Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2],
          color: colorPool[items.length % colorPool.length],
          size,
          index: items.length
        });
      }
    }
    return items;
  }, []);

  return (
    <group>
      {gifts.map((gift, i) => (
        <GiftBox key={i} {...gift} mode={mode} />
      ))}
    </group>
  );
};
