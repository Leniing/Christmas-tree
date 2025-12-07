import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UI } from './components/UI';
import { AudioPlayer } from './components/AudioPlayer';
import { InteractionState } from './types';

export default function App() {
  const [mode, setMode] = useState<InteractionState>(InteractionState.Tree);
  const [started, setStarted] = useState(false);

  return (
    <div className="w-full h-screen bg-[#050505]">
      {/* 2D UI Overlay */}
      <UI started={started} onStart={() => setStarted(true)} />
      
      {/* Audio Manager */}
      <AudioPlayer start={started} />

      {/* 3D Scene */}
      <Canvas 
        shadows 
        // Update camera position:
        // x=0, z=25: Front view
        // y=5: Raised view (using half the tree height as the horizontal level)
        camera={{ position: [0, 5, 25], fov: 45 }}
        dpr={[1, 2]} // Handle high DPI screens
        gl={{ antialias: true, toneMappingExposure: 1.2 }}
      >
        <Suspense fallback={null}>
          <Experience mode={mode} setMode={setMode} />
        </Suspense>
      </Canvas>
      
      {/* Loading Bar */}
      <Loader 
        containerStyles={{ background: 'black' }} 
        innerStyles={{ background: '#333' }}
        barStyles={{ background: '#FFD700' }}
        dataStyles={{ color: '#FFD700', fontFamily: 'serif' }}
      />
    </div>
  );
}