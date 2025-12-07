import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractionState } from '../types';

interface SnowSystemProps {
  mode: InteractionState;
}

export const SnowSystem: React.FC<SnowSystemProps> = ({ mode }) => {
  const count = 6000; 
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Data layout: [x, y, z, velocityY, wobblePhase, state]
  // state: 0 = falling, 1 = landed
  const particles = useMemo(() => {
    const data = new Float32Array(count * 6);
    // Initialize with random positions
    for (let i = 0; i < count; i++) {
      resetParticle(data, i, true);
    }
    return data;
  }, []);

  function resetParticle(data: Float32Array, i: number, fullRandomY = false) {
    const i6 = i * 6;
    // EXPANDED RANGE: Radius 45 to cover the entire view (Immersive), as requested to stay unchanged
    const radius = 45.0; 
    
    // Circular distribution
    const r = Math.sqrt(Math.random()) * radius;
    const theta = Math.random() * Math.PI * 2;

    data[i6] = r * Math.cos(theta); // x
    
    // Y Position
    // Spawn higher up to cover top of screen
    data[i6 + 1] = fullRandomY ? Math.random() * 40 + 5 : 30 + Math.random() * 15; 
    
    data[i6 + 2] = r * Math.sin(theta); // z
    
    // Fall Speed (Maintained gentle speed)
    data[i6 + 3] = 0.01 + Math.random() * 0.03; 
    
    // Wobble Phase
    data[i6 + 4] = Math.random() * Math.PI * 2;
    
    // State: Falling
    data[i6 + 5] = 0;
  }

  // Effect: When returning to Tree mode, clear accumulated snow (reset all)
  const prevMode = useRef(mode);
  useEffect(() => {
    if (prevMode.current === InteractionState.Exploded && mode === InteractionState.Tree) {
      for (let i = 0; i < count; i++) {
        resetParticle(particles, i, false); // false = spawn at top
      }
    }
    prevMode.current = mode;
  }, [mode, particles]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const groundLevel = -5.0; // Base of the tree
    
    // ACCUMULATION LOGIC:
    // Tree base radius is ~3.5. 
    // "1.5 times the area" => Radius * sqrt(1.5) => 3.5 * 1.225 approx 4.3.
    // Setting accumulation radius to 4.5.
    const accumulationRadius = 4.5; 
    
    const accumulationHeight = 0.2; 

    for (let i = 0; i < count; i++) {
      const i6 = i * 6;
      
      if (mode === InteractionState.Tree) {
        // --- TREE MODE: Fall & Accumulate ---
        
        if (particles[i6 + 5] === 0) { 
          // 1. Falling Logic
          particles[i6 + 1] -= particles[i6 + 3] * (delta * 60); // Apply gravity
          
          // Gentle lateral wobble
          particles[i6] += Math.sin(time + particles[i6 + 4]) * 0.005;
          particles[i6 + 2] += Math.cos(time * 0.8 + particles[i6 + 4]) * 0.005;

          // 2. Ground Detection
          const localGround = groundLevel + Math.random() * accumulationHeight;
          
          if (particles[i6 + 1] <= localGround) {
            // Check distance from center
            const distSq = particles[i6] * particles[i6] + particles[i6 + 2] * particles[i6 + 2];
            
            // Only accumulate if within the specific tree base area (1.5x area)
            if (distSq < accumulationRadius * accumulationRadius) {
              // Land
              particles[i6 + 1] = localGround;
              particles[i6 + 5] = 1; 
            } else {
              // Outside accumulation zone: Respawn immediately to keep "snowing"
              // This prevents "running out of snow" visually
              resetParticle(particles, i, false);
            }
          }
        } else {
          // 3. Landed Logic
          // To ensure we don't run out of falling snow eventually (if all particles land),
          // we slowly recycle landed particles back to the sky.
          // 0.1% chance per frame to "melt" and respawn
          if (Math.random() < 0.001) {
             resetParticle(particles, i, false);
          }
        }
        
      } else {
        // --- EXPLODED MODE: Scatter ---
        
        // Push everything away from center
        const x = particles[i6];
        const y = particles[i6 + 1];
        const z = particles[i6 + 2];
        
        const len = Math.sqrt(x*x + y*y + z*z) + 0.01;
        
        const speed = 15 * delta; 
        
        particles[i6] += (x / len) * speed;
        particles[i6 + 1] += (y / len) * speed;
        particles[i6 + 2] += (z / len) * speed;
        
        // Add turbulence
        particles[i6] += (Math.random() - 0.5) * 0.2;
        particles[i6 + 1] += (Math.random() - 0.5) * 0.2;
        particles[i6 + 2] += (Math.random() - 0.5) * 0.2;
        
        // Reset state so they fall again if mode switches back
        particles[i6 + 5] = 0; 
      }

      // Update Instance
      dummy.position.set(particles[i6], particles[i6 + 1], particles[i6 + 2]);
      
      // Random tumbling rotation
      dummy.rotation.set(
        time * 0.5 + particles[i6 + 4], 
        time * 0.3 + particles[i6 + 4], 
        0
      );
      
      // Scale: Tiny crystals
      dummy.scale.setScalar(0.04);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial 
        color="#ffffff" 
        emissive="#ffffff"
        emissiveIntensity={0.8}
        roughness={0.1}
        metalness={0.1}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
};
