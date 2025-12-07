import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface HandTrackerProps {
  onGestureChange: (isOpen: boolean) => void;
  onHandMove: (x: number) => void; // x is normalized 0 to 1
  enabled: boolean;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ onGestureChange, onHandMove, enabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  
  // Smoothing Refs
  const smoothedX = useRef(0.5);
  const smoothedRatio = useRef(1.2);
  const isOpenState = useRef(false);
  
  useEffect(() => {
    if (!enabled) return;

    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 }, // Lower resolution for higher FPS
            height: { ideal: 240 } 
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
        setLoaded(true);
      } catch (err) {
        console.error("Error initializing hand tracking:", err);
      }
    };

    let lastVideoTime = -1;
    const predictWebcam = () => {
      if (videoRef.current && handLandmarker) {
        const currentTime = videoRef.current.currentTime;
        if (currentTime !== lastVideoTime) {
          lastVideoTime = currentTime;
          const startTimeMs = performance.now();
          const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const wrist = landmarks[0];
            const tips = [8, 12, 16, 20];
            const mcps = [5, 9, 13, 17];
            
            const dist = (a: any, b: any) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
            
            let tipDistSum = 0;
            let mcpDistSum = 0;
            
            for (let i = 0; i < 4; i++) {
              tipDistSum += dist(landmarks[tips[i]], wrist);
              mcpDistSum += dist(landmarks[mcps[i]], wrist);
            }
            
            // Raw calculation
            const rawRatio = tipDistSum / mcpDistSum;
            
            // --- SMOOTHING ---
            // Increased alpha for better responsiveness while keeping stability
            const alpha = 0.25;
            smoothedRatio.current = smoothedRatio.current + (rawRatio - smoothedRatio.current) * alpha;

            // --- HYSTERESIS ---
            if (!isOpenState.current && smoothedRatio.current > 1.35) {
                isOpenState.current = true;
                onGestureChange(true);
            } else if (isOpenState.current && smoothedRatio.current < 1.25) {
                isOpenState.current = false;
                onGestureChange(false);
            }

            // --- X POSITION SMOOTHING ---
            // Invert logic for mirror effect: Real Right Hand -> Screen Right Side
            const targetX = 1 - wrist.x;
            
            // Use a dynamic smoothing factor? 
            // Fixed alpha of 0.2 gives a good balance of lag vs jitter.
            const posAlpha = 0.2; 
            smoothedX.current = smoothedX.current + (targetX - smoothedX.current) * posAlpha;
            
            onHandMove(smoothedX.current);
          }
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    setup();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
  }, [enabled, onGestureChange, onHandMove]);

  return (
    <div className="fixed bottom-4 left-4 z-40 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
       <video 
         ref={videoRef} 
         autoPlay 
         playsInline
         muted 
         style={{ width: '160px', borderRadius: '8px', transform: 'scaleX(-1)' }} 
         className={loaded ? "block border border-[#FFD700]/30" : "hidden"}
       />
       {loaded && <div className="text-[10px] text-[#FFD700] text-center mt-1 uppercase tracking-widest">Camera Active</div>}
    </div>
  );
};
