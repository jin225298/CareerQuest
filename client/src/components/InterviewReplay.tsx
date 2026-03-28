import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Download, X, Clock, MessageSquare } from 'lucide-react';

interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  duration?: number;
}

interface InterviewReplayProps {
  audioUrl: string | null;
  messages: TranscriptItem[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

function ReplayContent({
  audioUrl,
  messages,
  onClose,
}: {
  audioUrl: string | null;
  messages: TranscriptItem[];
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    
    const currentSeconds = audioRef.current.currentTime;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].timestamp <= currentSeconds) {
        setActiveMessageId(messages[i].id);
        break;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `interview-replay-${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-pixel-secondary rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pixel-accent/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-pixel-accent" />
            <h2 className="font-pixel text-lg text-white">面试回放</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          )}

          <div className="bg-pixel-primary rounded-lg p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                disabled={!audioUrl}
                className="w-12 h-12 rounded-full bg-pixel-accent flex items-center justify-center hover:bg-pixel-accent/80 transition-colors disabled:opacity-50"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-1" />
                )}
              </button>

              <div className="flex-1">
                <div 
                  className="h-2 bg-gray-700 rounded-full cursor-pointer"
                  onClick={handleSeek}
                >
                  <motion.div
                    className="h-full bg-pixel-accent rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={playbackRate}
                  onChange={e => setPlaybackRate(parseFloat(e.target.value))}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重播
              </button>
              <button
                onClick={handleDownload}
                disabled={!audioUrl}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">对话记录</span>
            </div>
            <div className="space-y-2">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  animate={{
                    backgroundColor: activeMessageId === msg.id 
                      ? 'rgba(59, 130, 246, 0.1)' 
                      : 'transparent',
                  }}
                  className={`p-2 rounded ${
                    msg.role === 'user' ? 'bg-pixel-accent/20 ml-8' : 'bg-gray-700/50 mr-8'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <span className="font-medium">
                      {msg.role === 'user' ? '我' : '面试官'}
                    </span>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-200">{msg.content}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function InterviewReplay({
  audioUrl,
  messages,
  isOpen,
  onClose,
}: InterviewReplayProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <ReplayContent
        key={isOpen ? 'open' : 'closed'}
        audioUrl={audioUrl}
        messages={messages}
        onClose={onClose}
      />
    </AnimatePresence>
  );
}
