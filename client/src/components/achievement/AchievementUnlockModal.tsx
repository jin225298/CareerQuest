import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Flame, Zap, Clock, MessageCircle, Shield, Calendar, Award } from 'lucide-react';

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic';
  reward_power: number;
  reward_mood: number;
}

interface AchievementUnlockModalProps {
  achievements: Achievement[];
  onClose: () => void;
  onNotify?: (achievementId: number) => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  trophy: Trophy,
  briefcase: Award,
  award: Award,
  star: Star,
  flame: Flame,
  zap: Zap,
  clock: Clock,
  'message-circle': MessageCircle,
  shield: Shield,
  calendar: Calendar,
};

const rarityConfig = {
  common: { label: '普通', bg: 'bg-gray-500', glow: 'shadow-gray-400/50' },
  rare: { label: '稀有', bg: 'bg-blue-500', glow: 'shadow-blue-400/50' },
  epic: { label: '史诗', bg: 'bg-purple-500', glow: 'shadow-purple-400/50' },
};

export function AchievementUnlockModal({ achievements, onClose, onNotify }: AchievementUnlockModalProps) {
  useEffect(() => {
    if (achievements.length > 0) {
      achievements.forEach((a) => onNotify?.(a.id));
    }
  }, [achievements, onNotify]);

  if (achievements.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-center mb-6"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
              className="text-4xl mb-2"
            >
              🎉
            </motion.div>
            <h2 className="font-pixel text-xl text-white">成就解锁！</h2>
          </motion.div>

          <div className="space-y-4">
            {achievements.map((achievement, index) => {
              const Icon = iconMap[achievement.icon] || Trophy;
              const config = rarityConfig[achievement.rarity];
              
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl bg-pixel-secondary border border-white/10 ${config.glow} shadow-lg`}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </motion.div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{config.label}</span>
                      </div>
                      <h3 className="font-medium text-white">{achievement.name}</h3>
                      <p className="text-sm text-gray-400">{achievement.description}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-green-400 text-sm">+{achievement.reward_power}</div>
                      <div className="text-pink-400 text-sm">+{achievement.reward_mood}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="w-full mt-6 py-3 bg-pixel-accent hover:bg-pixel-accent/80 rounded-xl text-white font-medium transition-colors"
          >
            太棒了！
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
