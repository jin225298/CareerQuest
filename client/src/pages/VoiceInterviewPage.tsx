import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone } from 'lucide-react';
import { PhoneCallUI } from '../components/PhoneCallUI';
import { voiceApi } from '../lib/api';

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended';

export function VoiceInterviewPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === 'active') {
      interval = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    if (status === 'active') {
      const speakingInterval = setInterval(() => {
        setIsSpeaking((s) => !s);
      }, 3000);
      return () => clearInterval(speakingInterval);
    }
  }, [status]);

  const startSession = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      const response = await voiceApi.startSession({
        position: undefined,
        company: undefined,
      });
      setSessionId(response.session_id);
      setStatus('active');
      setDuration(0);
    } catch (err) {
      console.error('Failed to start voice session:', err);
      setError('连接失败，请重试');
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      startSession();
    }, 500);
    return () => clearTimeout(timer);
  }, [startSession]);

  const handleEndCall = async () => {
    if (sessionId) {
      try {
        await voiceApi.endSession(sessionId);
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    }
    setStatus('ended');
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleToggleMute = () => {
    setIsMuted((m) => !m);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#e8f4fc' }}>
      <div className="flex items-center justify-between p-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">返回</span>
        </motion.button>

        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-500" />
          <span className="text-gray-700 font-medium">语音面试</span>
        </div>

        <div className="w-16" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm aspect-[3/4] bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden"
        >
          <PhoneCallUI
            status={status}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            duration={duration}
            onEndCall={handleEndCall}
            onToggleMute={handleToggleMute}
          />
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full text-sm"
        >
          {error}
        </motion.div>
      )}

      {status === 'ended' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div className="text-center bg-white rounded-2xl p-8 mx-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-6xl mb-4"
            >
              👋
            </motion.div>
            <p className="text-gray-800 text-xl mb-2">通话已结束</p>
            <p className="text-gray-500 text-sm">正在返回主页...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
