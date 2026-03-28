import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Brain, Heart, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CheckInSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  rewards: { power: number; mood: number };
}

const ENCOURAGEMENTS = [
  '坚持就是胜利！',
  '每一天都是新的开始！',
  '你的努力终将得到回报！',
  '保持热爱，奔赴山海！',
  '相信自己，你是最棒的！',
];

const getRandomEncouragement = () => {
  const index = Date.now() % ENCOURAGEMENTS.length;
  return ENCOURAGEMENTS[index];
};

export function CheckInSuccessModal({ isOpen, onClose, streakDays, rewards }: CheckInSuccessModalProps) {
  const navigate = useNavigate();
  const encouragement = getRandomEncouragement();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-gradient-to-br from-orange-400 to-red-500 pt-8 pb-6 px-4 text-center relative overflow-hidden">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative z-10"
              >
                <div className="text-6xl mb-2">🎉</div>
                <h2 className="text-white text-xl font-bold">打卡成功！</h2>
              </motion.div>

              {[...Array(10)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: -100, opacity: [0, 1, 0] }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 1.5 }}
                  className="absolute text-2xl"
                  style={{ left: `${10 + i * 8}%`, top: '50%' }}
                >
                  {['✨', '🌟', '⭐', '💫', '🔥'][i % 5]}
                </motion.span>
              ))}
            </div>

            <div className="p-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Flame className="w-6 h-6 text-orange-500" />
                <span className="text-2xl font-bold text-gray-800">连续 {streakDays} 天</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-blue-50 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">武力值</p>
                    <p className="font-bold text-blue-600">+{rewards.power}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-pink-50 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">心情值</p>
                    <p className="font-bold text-pink-600">+{rewards.mood}</p>
                  </div>
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-gray-500 text-sm mb-4"
              >
                {encouragement}
              </motion.p>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    navigate('/friends');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  查看日历
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 py-2 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-lg font-medium hover:shadow-md transition-all"
                >
                  继续加油
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
