import { motion } from 'framer-motion';
import { Heart, User } from 'lucide-react';

export interface TreeHolePostData {
  id: number;
  emotion: string;
  content: string;
  likes_count: number;
  created_at: string;
  is_anonymous: boolean;
  author_name: string | null;
  is_liked: boolean;
}

interface TreeHolePostProps {
  post: TreeHolePostData;
  onLike: (postId: number, isLiked: boolean) => void;
}

const EMOTION_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  joy: { emoji: '😊', color: 'text-yellow-500', bg: 'bg-yellow-100' },
  sad: { emoji: '😢', color: 'text-blue-500', bg: 'bg-blue-100' },
  hope: { emoji: '🎯', color: 'text-green-500', bg: 'bg-green-100' },
  anxiety: { emoji: '😰', color: 'text-orange-500', bg: 'bg-orange-100' },
};

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
};

export function TreeHolePost({ post, onLike }: TreeHolePostProps) {
  const config = EMOTION_CONFIG[post.emotion] || EMOTION_CONFIG.joy;

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <span className="text-xl">{config.emoji}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {post.is_anonymous ? (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                匿名用户
              </span>
            ) : (
              <span className="text-sm text-gray-600">{post.author_name || '用户'}</span>
            )}
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{formatTimeAgo(post.created_at)}</span>
          </div>
          
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>
          
          <div className="flex items-center gap-4 mt-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onLike(post.id, post.is_liked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                post.is_liked
                  ? 'bg-red-100 text-red-500'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
              <span className="text-sm">{post.likes_count}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
