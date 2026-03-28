import { motion } from 'framer-motion';
import { X, Brain, Heart, Trophy, Star } from 'lucide-react';

interface UserStats {
  power: number;
  mood: number;
  hp: number;
  wins: number;
  totalInterviews: number;
  avgScore: number;
}

interface UserStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
}

export function UserStatsModal({ isOpen, onClose, stats }: UserStatsModalProps) {
  if (!isOpen) return null;

  const statItems = [
    { label: '武力值', value: stats.power, icon: Brain, color: 'text-blue-400', bg: 'bg-blue-400' },
    { label: '心情值', value: stats.mood, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-400' },
    { label: '胜场数', value: stats.wins, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400' },
    { label: '面试次数', value: stats.totalInterviews, icon: Star, color: 'text-green-400', bg: 'bg-green-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-pixel-secondary rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="bg-pixel-accent/20 px-4 py-3 flex items-center justify-between">
          <h2 className="font-pixel text-sm text-white">角色属性</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <img 
                src="/avatar.gif" 
                alt="Avatar" 
                className="w-24 h-24 object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            </motion.div>
          </div>

          <div className="space-y-4">
            {statItems.map((item, index) => {
              const Icon = item.icon;
              const isPercentage = item.label.includes('值');
              
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg ${item.bg}/20 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">{item.label}</span>
                      <span className={`text-sm font-medium ${item.color}`}>
                        {item.value}{isPercentage ? '%' : ''}
                      </span>
                    </div>
                    {isPercentage && (
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${item.bg}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {stats.totalInterviews > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-4 bg-pixel-primary rounded-lg text-center"
            >
              <p className="text-xs text-gray-400 mb-1">平均分数</p>
              <p className="text-2xl font-pixel text-pixel-accent">
                {stats.avgScore.toFixed(1)}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
