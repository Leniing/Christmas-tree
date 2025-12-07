import React, { useState, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UI } from './components/UI';
import { AudioPlayer } from './components/AudioPlayer';
import { HandTracker } from './components/HandTracker';
import { InteractionState } from './types';

export default function App() {
  const [mode, setMode] = useState<InteractionState>(InteractionState.Tree);
  const [started, setStarted] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(0);

  // Hand Tracking Callbacks
  const handleGesture = useCallback((isOpen: boolean) => {
    // Open Hand = Explode
    // Closed Hand = Tree
    const targetMode = isOpen ? InteractionState.Exploded : InteractionState.Tree;
    setMode(prev => {
      if (prev !== targetMode) return targetMode;
      return prev;
    });
  }, []);

  const handleHandMove = useCallback((x: number) => {
    // x is Screen Position: 0 (Left) to 1 (Right)
    
    // Joystick Logic:
    // Center (0.5) = No Rotation
    
    // Deadzone: 0.45 to 0.55
    const CENTER = 0.5;
    const DEADZONE = 0.05; 
    // Increased sensitivity for snappier control
    const SENSITIVITY = 6.0; 

    let speed = 0;
    
    if (x < CENTER - DEADZONE) {
      // Left Side
      // range: 0 to 0.45. normalized: 0.45 to 0
      const dist = (CENTER - DEADZONE) - x;
      // Inverted direction based on feedback: Left Hand -> Negative Speed
      speed = -dist * SENSITIVITY; 
    } else if (x > CENTER + DEADZONE) {
      // Right Side
      // range: 0.55 to 1.0
      const dist = x - (CENTER + DEADZONE);
      speed = dist * SENSITIVITY; 
    }
    
    setRotationSpeed(speed);
  }, []);

  return (
    <div className="w-full h-screen bg-[#050505]">
      {/* 2D UI Overlay */}
      <UI started={started} onStart={() => setStarted(true)} />
      
      {/* Audio Manager */}
      <AudioPlayer start={started} />

      {/* Hand Tracker (Only active after start) */}
      <HandTracker 
        enabled={started} 
        onGestureChange={handleGesture} 
        onHandMove={handleHandMove} 
      />

      {/* 3D Scene */}
      <Canvas 
        shadows 
        camera={{ position: [0, 5, 25], fov: 45 }}
        dpr={[1, 2]} 
        gl={{ antialias: true, toneMappingExposure: 1.2 }}
      >
        <Suspense fallback={null}>
          <Experience 
            mode={mode} 
            setMode={setMode} 
            rotationSpeed={rotationSpeed}
          />
        </Suspense>
      </Canvas>
      
      <Loader 
        containerStyles={{ background: 'black' }} 
        innerStyles={{ background: '#333' }}
        barStyles={{ background: '#FFD700' }}
        dataStyles={{ color: '#FFD700', fontFamily: 'serif' }}
      />
    </div>
  );
}
