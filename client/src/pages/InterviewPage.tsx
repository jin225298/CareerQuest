import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Square, Gift, BarChart3, HelpCircle } from 'lucide-react';
import { interviewApi, taskApi } from '../lib/api';
import { StressBar } from '../components/StressBar';
import { CompanionNPC } from '../components/CompanionNPC';
import { InterviewReplay } from '../components/InterviewReplay';
import { DailyTaskPanel } from '../components/DailyTaskPanel';
import { useAudioRecording } from '../hooks/useAudioRecording';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  duration?: number;
}

interface StartInterviewResult {
  session_id: string;
  first_question: string;
}

interface ReplyResult {
  response: string;
}

interface EndInterviewResult {
  score: number;
  feedback: string;
}

interface InterviewResult {
  score: number;
  dimensions: {
    expression: number;
    logic: number;
    professional: number;
    adaptability: number;
    emotion: number;
  };
  feedback: string;
  powerGained: number;
  moodGained: number;
  sessionId?: string;
}

export function InterviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const survey = location.state?.survey;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stressLevel, setStressLevel] = useState(0);
  const [avatarState, setAvatarState] = useState<'idle' | 'speaking' | 'listening' | 'nervous' | 'happy'>('idle');
  const [isStuck, setIsStuck] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [interviewStartTime, setInterviewStartTime] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const audioStreamRef = useRef<MediaStream | null>(null);
  const stressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { 
    isRecording: isAudioRecording, 
    startRecording, 
    stopRecording, 
    audioUrl, 
  } = useAudioRecording();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    startInterview();
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (stressIntervalRef.current) {
        clearInterval(stressIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    stressIntervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
      
      if (timeSinceLastActivity > 10000 && !isLoading) {
        setIsStuck(true);
        setStressLevel(prev => Math.min(prev + 3, 100));
      }
      
      if (isLoading) {
        setStressLevel(prev => Math.min(prev + 1, 100));
      }
      
      if (isRecording) {
        setStressLevel(prev => Math.min(prev + 0.5, 100));
      }
    }, 3000);

    return () => {
      if (stressIntervalRef.current) {
        clearInterval(stressIntervalRef.current);
      }
    };
  }, [isLoading, isRecording]);

  useEffect(() => {
    if (isAudioRecording) {
      setAvatarState('speaking');
    } else if (isLoading) {
      setAvatarState('listening');
    } else if (stressLevel > 70) {
      setAvatarState('nervous');
    } else if (stressLevel < 20 && questionCount > 0) {
      setAvatarState('happy');
    } else {
      setAvatarState('idle');
    }
  }, [isAudioRecording, isLoading, stressLevel, questionCount]);

  const startInterview = async () => {
    setIsLoading(true);
    setError(null);
    setStressLevel(0);
    setQuestionCount(0);
    setInterviewStartTime(Date.now());
    lastActivityTimeRef.current = Date.now();
    
    try {
      const result = await interviewApi.start({
        type: 'hr',
        difficulty: 'medium',
        position: survey?.targetPosition || '软件开发',
      }) as StartInterviewResult;
      
      setSessionId(result.session_id);
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: result.first_question,
          timestamp: 0,
        },
      ]);
      
      startRecording();
    } catch (err: unknown) {
      console.error('Failed to start interview:', err);
      setError(err instanceof Error ? err.message : '启动面试失败');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || !sessionId || isLoading) return;

    lastActivityTimeRef.current = Date.now();
    setIsStuck(false);
    setStressLevel(prev => Math.max(prev - 5, 0));

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: (Date.now() - interviewStartTime) / 1000,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await interviewApi.reply({
        session_id: sessionId,
        message,
      }) as ReplyResult;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: (Date.now() - interviewStartTime) / 1000,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setQuestionCount(prev => prev + 1);
      lastActivityTimeRef.current = Date.now();
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : '发送消息失败');
      setStressLevel(prev => Math.min(prev + 15, 100));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to access microphone:', err);
        setError('无法访问麦克风');
      }
    }
  };

  const endInterview = async () => {
    if (!sessionId || isEnding) return;
    
    setIsEnding(true);
    stopRecording();
    
    try {
      const result = await interviewApi.end({ 
        session_id: sessionId,
        max_stress: stressLevel
      }) as EndInterviewResult & { unlocked_achievements?: unknown[] };
      
      try {
        await taskApi.updateProgress({ task_id: 1, increment: 1 });
      } catch (taskError) {
        console.warn('Failed to update task progress:', taskError);
      }
      
      const interviewResult: InterviewResult = {
        score: result.score || Math.floor(Math.random() * 30) + 70,
        dimensions: {
          expression: Math.floor(Math.random() * 20) + 70,
          logic: Math.floor(Math.random() * 20) + 70,
          professional: Math.floor(Math.random() * 20) + 70,
          adaptability: Math.floor(Math.random() * 20) + 70,
          emotion: 100 - stressLevel,
        },
        feedback: result.feedback || '面试表现不错！继续保持！',
        powerGained: Math.floor(Math.random() * 20) + 10,
        moodGained: Math.floor(Math.random() * 10) + 5,
        sessionId: sessionId,
      };
      
      navigate('/result', { 
        state: { 
          result: interviewResult,
          messages,
          duration: (Date.now() - interviewStartTime) / 1000,
          audioUrl,
          unlockedAchievements: result.unlocked_achievements || []
        } 
      });
    } catch (error: unknown) {
      console.error('Failed to end interview:', error);
      setError(`结束面试失败: ${error instanceof Error ? error.message : '请重试'}`);
      setIsEnding(false);
    }
  };

  const requestHint = () => {
    setIsStuck(true);
    setStressLevel(prev => Math.min(prev + 5, 100));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#e8f4fc' }}>
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-pixel text-lg text-blue-500">
              面试进行中
            </h1>
            <div className="w-32">
              <StressBar level={stressLevel} showLabel={false} />
            </div>
            <span className="text-sm text-gray-500">
              第 {questionCount + 1} 轮
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReplay(true)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="查看回放"
            >
              <Gift size={20} />
            </button>
            <button
              onClick={() => setShowTasks(true)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="每日任务"
            >
              <BarChart3 size={20} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 p-3 text-center text-red-500 text-sm">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            关闭
          </button>
        </div>
      )}

      <div className="flex-1 flex">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-pixel text-xs text-blue-500">AI</span>
                        </div>
                        <span className="text-sm text-gray-500 font-medium">面试官</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="hidden lg:block w-64 p-4 bg-white border-l border-gray-200">
          <div className="sticky top-4 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">你的分身</p>
              <motion.div
                animate={{ 
                  y: [0, -4, 0],
                  scale: avatarState === 'nervous' ? [1, 1.02, 1] : 1,
                }}
                transition={{ 
                  y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 0.3, repeat: avatarState === 'nervous' ? Infinity : 0 }
                }}
                className="relative inline-block"
              >
                <img 
                  src="/avatar.gif" 
                  alt="Avatar" 
                  className="w-24 h-24 object-contain pixelated"
                  style={{ imageRendering: 'pixelated' }}
                />
                {stressLevel > 50 && (
                  <motion.div
                    className="absolute top-0 right-0"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <span className="text-xl">💦</span>
                  </motion.div>
                )}
              </motion.div>
            </div>
            
            <StressBar level={stressLevel} />

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <BarChart3 className="w-4 h-4" />
                面试统计
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-lg font-pixel text-blue-500">{questionCount}</div>
                  <div className="text-xs text-gray-400">对话轮数</div>
                </div>
                <div>
                  <div className="text-lg font-pixel text-blue-500">
                    {Math.floor((Date.now() - interviewStartTime) / 60000)}
                  </div>
                  <div className="text-xs text-gray-400">分钟</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={requestHint}
                className="w-full py-2 px-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <HelpCircle size={16} />
                请求提示
              </button>
              <button
                onClick={endInterview}
                disabled={isEnding}
                className="w-full py-2 px-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Square size={16} />
                {isEnding ? '结束中...' : '结束面试'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white'
              }`}
              title={isRecording ? '停止录音' : '开始录音'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的回答..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-lg text-gray-800 placeholder-gray-400 border-2 border-transparent focus:border-blue-500 outline-none"
              disabled={isLoading}
            />
            
            <button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="px-4 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
            
            <button
              onClick={endInterview}
              disabled={isEnding || messages.length < 2}
              className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors disabled:opacity-50"
              title="结束面试"
            >
              <Square size={20} />
            </button>
          </div>
        </div>
      </div>

      <CompanionNPC 
        isStuck={isStuck}
        stressLevel={stressLevel}
      />

      <InterviewReplay
        audioUrl={audioUrl}
        messages={messages}
        isOpen={showReplay}
        onClose={() => setShowReplay(false)}
      />

      <DailyTaskPanel
        isOpen={showTasks}
        onClose={() => setShowTasks(false)}
      />
    </div>
  );
}
