import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle } from 'lucide-react';
import { checkinApi } from '../lib/api';
import { CheckInSuccessModal } from './CheckInSuccessModal';

interface CheckInButtonProps {
  compact?: boolean;
}

export function CheckInButton({ compact = false }: CheckInButtonProps) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [rewards, setRewards] = useState({ power: 0, mood: 0 });

  const fetchTodayStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await checkinApi.getToday();
      setCheckedIn(data.checked_in);
      setStreakDays(data.streak_days);
    } catch (err) {
      console.error('Failed to fetch checkin status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  const handleCheckIn = async () => {
    if (checkedIn || checking) return;
    setChecking(true);
    try {
      const result = await checkinApi.checkIn({ mood: 'good' });
      setCheckedIn(true);
      setStreakDays(result.streak_days);
      setRewards(result.rewards);
      setShowSuccess(true);
    } catch (err) {
      console.error('Failed to check in:', err);
    } finally {
      setChecking(false);
    }
  };

  if (compact) {
    return (
      <>
        <motion.button
          whileHover={{ scale: checkedIn ? 1 : 1.1 }}
          whileTap={{ scale: checkedIn ? 1 : 0.95 }}
          onClick={handleCheckIn}
          disabled={checkedIn || checking}
          className="flex flex-col items-center gap-1"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : checkedIn ? (
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-xs font-pixel text-gray-600">
            {checkedIn ? '已打卡' : '打卡'}
          </span>
          {!loading && streakDays > 0 && (
            <span className="text-xs text-orange-500 font-bold">{streakDays}天</span>
          )}
        </motion.button>

        <CheckInSuccessModal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          streakDays={streakDays}
          rewards={rewards}
        />
      </>
    );
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: checkedIn ? 1 : 1.05 }}
        whileTap={{ scale: checkedIn ? 1 : 0.95 }}
        onClick={handleCheckIn}
        disabled={checkedIn || checking}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
          checkedIn
            ? 'bg-green-100 text-green-600 cursor-default'
            : 'bg-gradient-to-r from-orange-400 to-red-500 text-white hover:shadow-lg'
        }`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : checkedIn ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">已打卡</span>
          </>
        ) : (
          <>
            <Flame className="w-5 h-5" />
            <span className="text-sm font-medium">打卡</span>
          </>
        )}

        {!loading && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full"
          >
            {streakDays}
          </motion.div>
        )}

        {checking && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {checking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
          >
            {[...Array(8)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ y: 0, opacity: 1, x: 0 }}
                animate={{
                  y: -100 - Math.random() * 100,
                  opacity: 0,
                  x: (Math.random() - 0.5) * 100,
                }}
                transition={{ duration: 1, delay: i * 0.1 }}
                className="absolute text-2xl"
              >
                {['✨', '🌟', '⭐', '💫'][i % 4]}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <CheckInSuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        streakDays={streakDays}
        rewards={rewards}
      />
    </>
  );
}
