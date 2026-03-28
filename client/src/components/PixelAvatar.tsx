import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

type AvatarState = 'idle' | 'speaking' | 'listening' | 'nervous' | 'happy';

interface PixelAvatarProps {
  state?: AvatarState;
  stressLevel?: number;
  className?: string;
  audioStream?: MediaStream | null;
}

const SPRITE_SIZE = 48;

export function PixelAvatar({ 
  state = 'idle', 
  stressLevel = 0,
  className = '',
  audioStream
}: PixelAvatarProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const shouldAnimate = state === 'speaking' || isSpeaking;

  useEffect(() => {
    if (shouldAnimate) {
      const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % 4);
      }, 100);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [shouldAnimate]);

  useEffect(() => {
    if (!shouldAnimate && frameIndex !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFrameIndex(0);
    }
  }, [shouldAnimate, frameIndex]);

  useEffect(() => {
    if (!audioStream) return;

    const setupAudioAnalyser = async () => {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaStreamSource(audioStream);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        
        const checkAudioLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          
          setIsSpeaking(average > 20);
          animationRef.current = requestAnimationFrame(checkAudioLevel);
        };
        
        checkAudioLevel();
      } catch (err) {
        console.error('Failed to setup audio analyser:', err);
      }
    };

    setupAudioAnalyser();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioStream]);

  const getBodyColor = () => {
    if (stressLevel > 70) return '#ef4444';
    if (stressLevel > 40) return '#f59e0b';
    return '#38bdf8';
  };

  const getAnimationClass = () => {
    switch (state) {
      case 'speaking':
      case 'listening':
        return 'animate-pulse';
      case 'nervous':
        return 'animate-bounce';
      case 'happy':
        return 'animate-bounce';
      default:
        return '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`relative ${getAnimationClass()}`}
        animate={{
          scale: state === 'nervous' ? [1, 1.02, 1] : 1,
          rotate: state === 'nervous' ? [0, -1, 1, 0] : 0,
        }}
        transition={{
          duration: 0.3,
          repeat: state === 'nervous' ? Infinity : 0,
        }}
      >
        <div
          className="relative"
          style={{
            width: SPRITE_SIZE * 3,
            height: SPRITE_SIZE * 3,
            imageRendering: 'pixelated',
          }}
        >
          <svg
            viewBox="0 0 48 48"
            style={{ width: '100%', height: '100%' }}
          >
            <rect x="20" y="2" width="8" height="4" fill="#6b4423" />
            <rect x="16" y="6" width="16" height="8" fill="#8b5a2b" />
            <rect x="18" y="4" width="12" height="6" fill="#6b4423" />
            
            <rect x="16" y="10" width="16" height="12" fill="#fcd5b8" />
            
            <rect x="20" y="12" width="3" height="3" fill="#2d1b0e" />
            <rect x="25" y="12" width="3" height="3" fill="#2d1b0e" />
            
            {state === 'happy' ? (
              <>
                <rect x="21" y="17" width="2" height="2" fill="#2d1b0e" />
                <rect x="25" y="17" width="2" height="2" fill="#2d1b0e" />
                <rect x="21" y="19" width="6" height="2" fill="#ff6b6b" />
              </>
            ) : state === 'nervous' ? (
              <>
                <rect x="20" y="17" width="4" height="1" fill="#2d1b0e" />
                <rect x="24" y="17" width="4" height="1" fill="#2d1b0e" />
                <rect x="22" y="19" width="4" height="1" fill="#2d1b0e" />
              </>
            ) : (state === 'speaking' || isSpeaking) ? (
              <>
                <rect x="21" y="17" width="2" height="2" fill="#2d1b0e" />
                <rect x="25" y="17" width="2" height="2" fill="#2d1b0e" />
                <rect 
                  x="21" 
                  y="19" 
                  width="6" 
                  height={frameIndex % 2 === 0 ? 1 : 2} 
                  fill="#2d1b0e" 
                />
              </>
            ) : (
              <>
                <rect x="21" y="17" width="2" height="2" fill="#2d1b0e" />
                <rect x="25" y="17" width="2" height="2" fill="#2d1b0e" />
                <rect x="22" y="19" width="4" height="1" fill="#2d1b0e" />
              </>
            )}
            
            <rect x="14" y="6" width="20" height="4" fill="#4a90d9" rx="1" />
            <rect x="12" y="8" width="4" height="4" fill="#fcd5b8" />
            <rect x="32" y="8" width="4" height="4" fill="#fcd5b8" />
            
            <rect x="14" y="22" width="20" height="16" fill={getBodyColor()} />
            <rect x="10" y="24" width="4" height="12" fill="#fcd5b8" />
            <rect x="34" y="24" width="4" height="12" fill="#fcd5b8" />
            
            <rect x="16" y="38" width="6" height="8" fill="#4a5568" />
            <rect x="26" y="38" width="6" height="8" fill="#4a5568" />
          </svg>

          {stressLevel > 50 && (
            <motion.div
              className="absolute top-0 right-0"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <span className="text-2xl">💦</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="w-32 h-3 bg-black/30 rounded-full" style={{ transform: 'scaleY(0.3)' }} />
      </div>
    </div>
  );
}
