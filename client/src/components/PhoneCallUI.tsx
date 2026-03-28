import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';

interface PhoneCallUIProps {
  status: 'idle' | 'connecting' | 'active' | 'ended';
  isSpeaking: boolean;
  isMuted: boolean;
  duration: number;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export function PhoneCallUI({
  status,
  isSpeaking,
  isMuted,
  duration,
  onEndCall,
  onToggleMute,
}: PhoneCallUIProps) {
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(12).fill(20));

  useEffect(() => {
    if (status === 'active' && isSpeaking) {
      const interval = setInterval(() => {
        setWaveformBars(
          Array(12)
            .fill(0)
            .map(() => Math.random() * 60 + 10)
        );
      }, 100);
      return () => clearInterval(interval);
    } else {
      setWaveformBars(Array(12).fill(20));
    }
  }, [status, isSpeaking]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return '准备通话...';
      case 'connecting':
        return '正在连接...';
      case 'active':
        return '通话中';
      case 'ended':
        return '通话已结束';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full py-8 px-4">
      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <div
            className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl ${
              status === 'active' && isSpeaking ? 'ring-4 ring-blue-300' : ''
            }`}
          >
            <span className="text-6xl">🤖</span>
          </div>
          {status === 'active' && isSpeaking && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-500"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-800">AI 面试官</h2>
          <p className="text-gray-500 text-sm mt-1">专业语音面试助手</p>
        </motion.div>

        <div className="flex items-center gap-2 text-gray-600">
          <span className={`w-2 h-2 rounded-full ${
            status === 'active' ? 'bg-green-500 animate-pulse' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'ended' ? 'bg-red-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm">{getStatusText()}</span>
          {status === 'active' && (
            <span className="text-sm font-mono ml-2">{formatDuration(duration)}</span>
          )}
        </div>

        <div className="w-full max-w-xs mt-4">
          <div className="flex items-center justify-center gap-1 h-16 bg-gray-100 rounded-xl">
            {waveformBars.map((height, index) => (
              <motion.div
                key={index}
                className="w-2 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full"
                animate={{
                  height: status === 'active' && isSpeaking ? height : 20,
                }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
          {status === 'active' && (
            <p className="text-center text-xs text-gray-400 mt-2">
              {isSpeaking ? 'AI 正在说话...' : '请开始您的回答'}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <AnimatePresence>
          {status === 'connecting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Volume2 className="w-5 h-5 text-blue-500" />
              </motion.div>
              <span className="text-blue-500 text-sm">正在呼叫...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-6">
          {status === 'active' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-400'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-gray-600" />
              )}
            </motion.button>
          )}

          {status === 'idle' || status === 'connecting' ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-lg"
            >
              <Phone className="w-8 h-8 text-white" />
            </motion.button>
          ) : status === 'active' ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEndCall}
              className="w-16 h-16 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center shadow-lg"
            >
              <PhoneOff className="w-8 h-8 text-gray-600" />
            </motion.button>
          )}

          {status === 'active' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center shadow-lg"
            >
              <Volume2 className="w-6 h-6 text-gray-600" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
