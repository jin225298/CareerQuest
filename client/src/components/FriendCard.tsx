import { motion } from 'framer-motion';
import { UserPlus, BarChart2, Trash2, Brain, Heart } from 'lucide-react';
import type { Friend } from '../lib/api';

interface FriendCardProps {
  friend: Friend;
  onInvite: (friend: Friend) => void;
  onCompare: (friend: Friend) => void;
  onDelete: (friend: Friend) => void;
}

export function FriendCard({ friend, onInvite, onCompare, onDelete }: FriendCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
          {friend.nickname?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-800 truncate">{friend.nickname}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <div className="flex items-center gap-1">
              <Brain className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">{friend.power}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-gray-600">{friend.mood}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
        <span>面试 {friend.total_interviews} 次</span>
        <span>平均分 {friend.avg_score.toFixed(1)}</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onInvite(friend)}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          邀请面试
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onCompare(friend)}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          对比成绩
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDelete(friend)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
