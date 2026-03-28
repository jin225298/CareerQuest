import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Loader2 } from 'lucide-react';
import { aiChatApi, taskApi, type TaskRecommendation } from '../lib/api';
import { TaskRecommendCard } from '../components/TaskRecommendCard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: TaskRecommendation[];
  timestamp: Date;
}

const NPC_AVATAR = 'http://localhost:8000/static/npcs/teacher.png';

export function AiChatPage() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRecommend, setLoadingRecommend] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const data = await aiChatApi.createSession();
      setSessionId(data.session_id);

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: '你好！我是导师小π 👨‍🏫\n\n我看过你的求职画像，发现你在算法方面可以加强。让我为你推荐一些学习任务吧！',
          timestamp: new Date(),
        },
      ]);

      const recommendations = await taskApi.getRecommendations();
      if (recommendations.length > 0) {
        setMessages(prev => [
          ...prev,
          {
            id: 'recommendations',
            role: 'assistant',
            content: '以下是为你精心挑选的任务推荐：',
            recommendations,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to init session:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiChatApi.sendMessage(sessionId, input);

      const assistantMessage: Message = {
        id: response.message_id,
        role: 'assistant',
        content: response.content,
        recommendations: response.recommendations,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [
        ...prev,
        {
          id: 'error',
          role: 'assistant',
          content: '抱歉，我遇到了一些问题，请稍后再试。',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRecommendation = async (id: number) => {
    setLoadingRecommend(id);
    try {
      await taskApi.acceptRecommendation(id);
      setMessages(prev =>
        prev.map(msg => {
          if (msg.recommendations) {
            return {
              ...msg,
              recommendations: msg.recommendations.filter(r => r.id !== id),
            };
          }
          return msg;
        })
      );
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '太好了！任务已添加到你的每日任务列表。加油完成它！ 💪',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Failed to accept recommendation:', err);
    } finally {
      setLoadingRecommend(null);
    }
  };

  const handleRejectRecommendation = async (id: number) => {
    setLoadingRecommend(id);
    try {
      await taskApi.rejectRecommendation(id);
      setMessages(prev =>
        prev.map(msg => {
          if (msg.recommendations) {
            return {
              ...msg,
              recommendations: msg.recommendations.filter(r => r.id !== id),
            };
          }
          return msg;
        })
      );
    } catch (err) {
      console.error('Failed to reject recommendation:', err);
    } finally {
      setLoadingRecommend(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-pixel-bg">
      <div className="bg-pixel-primary border-b border-pixel-accent/30 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-pixel-secondary flex items-center justify-center overflow-hidden">
          <img src={NPC_AVATAR} alt="导师小π" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h1 className="font-pixel text-sm text-white">导师小π</h1>
          <p className="text-xs text-gray-400">你的专属求职导师</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white transition-colors p-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-pixel-secondary flex-shrink-0 overflow-hidden">
                  <img src={NPC_AVATAR} alt="NPC" className="w-full h-full object-cover" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-pixel-accent text-white rounded-tr-sm'
                      : 'bg-pixel-secondary text-white rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.recommendations.map((rec) => (
                      <TaskRecommendCard
                        key={rec.id}
                        recommendation={rec}
                        onAccept={handleAcceptRecommendation}
                        onReject={handleRejectRecommendation}
                        isLoading={loadingRecommend === rec.id}
                      />
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-pixel-secondary flex-shrink-0 overflow-hidden">
              <img src={NPC_AVATAR} alt="NPC" className="w-full h-full object-cover" />
            </div>
            <div className="bg-pixel-secondary rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-pixel-accent animate-spin" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-pixel-primary border-t border-pixel-accent/30 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入消息..."
            className="flex-1 bg-pixel-secondary text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pixel-accent placeholder-gray-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 bg-pixel-accent hover:bg-pixel-accent/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
