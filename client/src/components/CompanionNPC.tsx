import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Lightbulb, Heart, HelpCircle } from 'lucide-react';

interface CompanionTip {
  id: string;
  type: 'encouragement' | 'hint' | 'warning';
  message: string;
  timestamp: Date;
}

interface CompanionNPCProps {
  isStuck?: boolean;
  stressLevel?: number;
  className?: string;
  scenario?: 'teacher' | 'interviewer';
}

const ENCOURAGEMENTS = [
  '加油！你可以的！',
  '深呼吸，慢慢来～',
  '相信自己，你准备得很好！',
  '这道题没有标准答案，说出你的想法就好',
  '面试官也是人，放轻松～',
  '不要紧张，把面试当作一次交流',
  '你的经验很宝贵，自信地展示出来！',
];

const HINTS = [
  '提示：可以从背景、行动、结果三个方面来回答（STAR法则）',
  '提示：试着用具体的例子来支持你的观点',
  '提示：考虑一下面试官为什么会问这个问题',
  '提示：展示你的思考过程比完美答案更重要',
  '提示：先思考几秒钟再回答不丢人',
  '提示：可以结合你的实际经历来回答',
];

const NPC_CONFIG = {
  teacher: {
    name: '导师小π',
    avatar: '/static/npcs/teacher.png',
    fallbackEmoji: '👨‍🏫',
  },
  interviewer: {
    name: '面试官',
    avatar: '/static/npcs/interviewer.png',
    fallbackEmoji: '👔',
  },
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function CompanionNPC({ 
  isStuck = false, 
  stressLevel = 0,
  className = '',
  scenario = 'teacher'
}: CompanionNPCProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTip, setCurrentTip] = useState<CompanionTip | null>(null);
  const [imageError, setImageError] = useState(false);
  const prevIsStuck = useRef(isStuck);

  const npcConfig = NPC_CONFIG[scenario];

  useEffect(() => {
    if (isStuck && !prevIsStuck.current) {
      const tip: CompanionTip = {
        id: crypto.randomUUID(),
        type: stressLevel > 70 ? 'warning' : 'hint',
        message: stressLevel > 70 ? getRandomItem(ENCOURAGEMENTS) : getRandomItem(HINTS),
        timestamp: new Date(),
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentTip(tip);
    }
    prevIsStuck.current = isStuck;
  }, [isStuck, stressLevel]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stressLevel > 40 && Math.random() > 0.5) {
        const tip: CompanionTip = {
          id: Date.now().toString(),
          type: 'encouragement',
          message: ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
          timestamp: new Date(),
        };
        setCurrentTip(tip);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [stressLevel]);

  useEffect(() => {
    if (stressLevel > 60) {
      const timeout = setTimeout(() => {
        if (stressLevel > 60) {
          const tip: CompanionTip = {
            id: Date.now().toString(),
            type: 'warning',
            message: '压力有点大哦，深呼吸放松一下～',
            timestamp: new Date(),
          };
          setCurrentTip(tip);
        }
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [stressLevel]);

  const dismissTip = () => {
    setCurrentTip(null);
  };

  const requestNewTip = () => {
    const tip: CompanionTip = {
      id: Date.now().toString(),
      type: 'hint',
      message: HINTS[Math.floor(Math.random() * HINTS.length)],
      timestamp: new Date(),
    };
    setCurrentTip(tip);
  };

  const getTipIcon = (type: string) => {
    switch (type) {
      case 'encouragement':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'hint':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'warning':
        return <MessageCircle className="w-4 h-4 text-red-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTipBgColor = (type: string) => {
    switch (type) {
      case 'encouragement':
        return 'bg-pink-100 border-pink-200';
      case 'hint':
        return 'bg-yellow-100 border-yellow-200';
      case 'warning':
        return 'bg-red-100 border-red-200';
      default:
        return 'bg-blue-100 border-blue-200';
    }
  };

  if (!isVisible) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg z-40"
        onClick={() => setIsVisible(true)}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </motion.button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 w-72 z-40">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xl">
        <div className="bg-blue-500 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
              {!imageError ? (
                <img
                  src={npcConfig.avatar}
                  alt={npcConfig.name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-sm">{npcConfig.fallbackEmoji}</span>
              )}
            </div>
            <span className="text-sm font-medium text-white">{npcConfig.name}</span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <AnimatePresence mode="wait">
            {currentTip ? (
              <motion.div
                key={currentTip.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`p-3 rounded-lg border ${getTipBgColor(currentTip.type)}`}
              >
                <div className="flex items-start gap-2">
                  {getTipIcon(currentTip.type)}
                  <p className="text-sm text-gray-700 flex-1">{currentTip.message}</p>
                </div>
                <button
                  onClick={dismissTip}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  知道了
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-3"
              >
                <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                  {!imageError ? (
                    <img
                      src={npcConfig.avatar}
                      alt={npcConfig.name}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <span className="text-2xl">{npcConfig.fallbackEmoji}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  我会一直陪着你～
                </p>
                <button
                  onClick={requestNewTip}
                  className="text-xs text-blue-500 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <HelpCircle size={12} />
                  点击获取提示
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>压力</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${stressLevel > 70 ? 'bg-red-500' : stressLevel > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                animate={{ width: `${stressLevel}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span>{Math.round(stressLevel)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
