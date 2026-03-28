import { motion } from 'framer-motion';
import { Check, X, Clock, Zap, Heart } from 'lucide-react';
import type { TaskRecommendation } from '../lib/api';

interface TaskRecommendCardProps {
  recommendation: TaskRecommendation;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  isLoading?: boolean;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'border-red-500/50 bg-red-500/10';
    case 'medium':
      return 'border-yellow-500/50 bg-yellow-500/10';
    case 'low':
      return 'border-green-500/50 bg-green-500/10';
    default:
      return 'border-gray-500/50 bg-gray-500/10';
  }
};

const getTaskTypeIcon = (type: string) => {
  switch (type) {
    case 'interview':
      return '🎤';
    case 'study':
      return '📚';
    case 'review':
      return '🎬';
    case 'practice':
      return '💻';
    default:
      return '📌';
  }
};

export function TaskRecommendCard({ recommendation, onAccept, onReject, isLoading }: TaskRecommendCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border-2 p-3 ${getPriorityColor(recommendation.priority)}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getTaskTypeIcon(recommendation.task_type)}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm">{recommendation.title}</h4>
          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{recommendation.description}</p>

          <div className="mt-2 p-2 bg-black/20 rounded text-xs text-gray-300">
            <span className="text-pixel-accent">推荐理由：</span>
            {recommendation.reason}
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{recommendation.estimated_time}分钟</span>
            </div>
            <div className="flex items-center gap-1 text-green-400">
              <Zap className="w-3 h-3" />
              <span>+{recommendation.reward_power}</span>
            </div>
            <div className="flex items-center gap-1 text-pink-400">
              <Heart className="w-3 h-3" />
              <span>+{recommendation.reward_mood}</span>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAccept(recommendation.id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              接受
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onReject(recommendation.id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              拒绝
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
