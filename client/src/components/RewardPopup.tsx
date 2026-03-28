import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Heart, Flame, X } from 'lucide-react';

interface RewardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  powerGained: number;
  moodGained: number;
  streakBonus: number;
  message?: string;
}

const PARTICLE_OFFSETS = [15, 45, 25, 55, 35];

export function RewardPopup({ isOpen, onClose, powerGained, moodGained, streakBonus, message }: RewardPopupProps) {
  const totalReward = powerGained + moodGained + streakBonus;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white rounded-2xl border-4 border-blue-500 p-6 max-w-sm w-full mx-4 pointer-events-auto relative shadow-xl">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="text-5xl mb-2"
                >
                  🎉
                </motion.div>
                <h2 className="font-pixel text-lg text-blue-500">任务完成！</h2>
                {message && (
                  <p className="text-gray-500 text-sm mt-2">{message}</p>
                )}
              </div>

              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-between bg-green-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">武力值</span>
                  </div>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="text-green-500 font-bold text-lg"
                  >
                    +{powerGained}
                  </motion.span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-between bg-pink-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    <span className="text-gray-700">心情值</span>
                  </div>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className="text-pink-500 font-bold text-lg"
                  >
                    +{moodGained}
                  </motion.span>
                </motion.div>

                {streakBonus > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-between bg-orange-50 rounded-lg p-3 border border-orange-200"
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-gray-700">连续奖励</span>
                    </div>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, type: 'spring' }}
                      className="text-orange-500 font-bold text-lg"
                    >
                      +{streakBonus}
                    </motion.span>
                  </motion.div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6 text-center"
              >
                <div className="text-3xl font-bold text-gray-800">
                  总计: <span className="text-blue-500">+{totalReward}</span>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-full mt-4 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                太棒了！
              </motion.button>

              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none"
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: 0, opacity: 1 }}
                      animate={{ y: -50 - PARTICLE_OFFSETS[i], opacity: 0 }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className="absolute text-2xl"
                      style={{ left: `${(i - 2) * 30}px` }}
                    >
                      ✨
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
