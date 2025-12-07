import React, { useState } from 'react';

interface UIProps {
  onStart: () => void;
  started: boolean;
}

export const UI: React.FC<UIProps> = ({ onStart, started }) => {
  const [faded, setFaded] = useState(false);

  const handleStart = () => {
    onStart();
    setFaded(true);
  };

  if (faded) {
    return (
      <div className="absolute top-0 left-0 w-full p-8 pointer-events-none z-10 flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl text-[#FFD700] font-serif-custom drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] opacity-90">
          Merry Christmas
        </h1>
        <p className="text-white/60 mt-4 text-sm font-light tracking-widest uppercase">
          Click to Interact • Drag to Rotate
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 transition-opacity duration-1000">
      <div className="text-center">
        <h1 className="text-6xl text-[#FFD700] font-serif-custom mb-8 animate-pulse">
          Merry Christmas
        </h1>
        <button 
          onClick={handleStart}
          className="px-8 py-3 border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-all duration-300 uppercase tracking-widest text-sm font-bold"
        >
          Enter Experience
        </button>
      </div>
    </div>
  );
};