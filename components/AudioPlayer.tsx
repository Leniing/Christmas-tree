import React, { useEffect, useRef, useState } from 'react';

// Using a public domain Jingle Bells classic
const MUSIC_URL = "https://upload.wikimedia.org/wikipedia/commons/e/e6/Jingle_Bells_-_Kevin_MacLeod_-_No_Copyright_Music.mp3";

export const AudioPlayer: React.FC<{ start: boolean }> = ({ start }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (start && audioRef.current) {
      audioRef.current.volume = 0.3; // Gentle volume
      audioRef.current.loop = true;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.log("Autoplay prevented:", e));
    }
  }, [start]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <audio ref={audioRef} src={MUSIC_URL} />
      <button 
        onClick={() => {
          if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
          }
        }}
        className="text-white/50 hover:text-white transition-colors text-xs uppercase tracking-widest"
      >
        {isPlaying ? "Mute Music" : "Play Music"}
      </button>
    </div>
  );
};