import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Flame, Zap, Clock, MessageCircle, Shield, Calendar, Award, X } from 'lucide-react';

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

interface AchievementModalProps {
  achievement: Achievement | null;
  onClose: () => void;
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
  common: {
    label: '普通',
    bgGradient: 'from-gray-600 to-gray-700',
    border: 'border-gray-400',
    glow: 'shadow-gray-500/30',
    iconBg: 'bg-gray-500',
  },
  rare: {
    label: '稀有',
    bgGradient: 'from-blue-600 to-blue-700',
    border: 'border-blue-400',
    glow: 'shadow-blue-500/50',
    iconBg: 'bg-blue-500',
  },
  epic: {
    label: '史诗',
    bgGradient: 'from-purple-600 to-pink-600',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/50',
    iconBg: 'bg-purple-500',
  },
};

export function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  if (!achievement) return null;

  const Icon = iconMap[achievement.icon] || Trophy;
  const config = rarityConfig[achievement.rarity];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-sm rounded-2xl border-2 ${config.border} ${config.glow} shadow-2xl overflow-hidden`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient} opacity-20`} />
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-radial from-yellow-400/30 to-transparent" />
          </motion.div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-white/60 hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="relative p-8 text-center">
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
              className={`w-24 h-24 mx-auto mb-6 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg`}
            >
              <Icon className="w-12 h-12 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                {config.label} 成就
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {achievement.name}
              </h2>
              <p className="text-gray-300 mb-6">
                {achievement.description}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center gap-4"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
                <span className="text-green-400 font-medium">+{achievement.reward_power}</span>
                <span className="text-green-400/60 text-sm">武力</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 rounded-lg">
                <span className="text-pink-400 font-medium">+{achievement.reward_mood}</span>
                <span className="text-pink-400/60 text-sm">心情</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
