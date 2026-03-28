import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { treeHoleApi } from '../lib/api';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMOTIONS = [
  { key: 'joy', label: '喜悦', emoji: '😊', description: '分享开心的面试经历' },
  { key: 'sad', label: '难过', emoji: '😢', description: '倾诉面试的遗憾' },
  { key: 'hope', label: '期待', emoji: '🎯', description: '对未来的憧憬' },
  { key: 'anxiety', label: '焦虑', emoji: '😰', description: '表达内心的担忧' },
];

export function CreatePostModal({ isOpen, onClose, onCreated }: CreatePostModalProps) {
  const [emotion, setEmotion] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!emotion || !content.trim()) return;

    setSubmitting(true);
    try {
      await treeHoleApi.createPost({
        emotion,
        content: content.trim(),
        is_anonymous: isAnonymous,
      });
      setContent('');
      setEmotion('');
      setIsAnonymous(false);
      onCreated();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setEmotion('');
    setIsAnonymous(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-white rounded-t-3xl p-6 border-t border-gray-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">分享心情</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">选择心情</label>
                <div className="grid grid-cols-4 gap-2">
                  {EMOTIONS.map(e => (
                    <button
                      key={e.key}
                      onClick={() => setEmotion(e.key)}
                      className={`p-3 rounded-xl text-center transition-colors ${
                        emotion === e.key
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">{e.emoji}</div>
                      <div className="text-xs text-gray-600">{e.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-2 block">想说的话</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="写下你的面试经历、心情或感悟..."
                  className="w-full h-32 bg-gray-100 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {content.length}/500
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    isAnonymous
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <span>{isAnonymous ? '🎭' : '👤'}</span>
                  <span className="text-sm">匿名发布</span>
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!emotion || !content.trim() || submitting}
                className="w-full py-3 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors"
              >
                {submitting ? '发布中...' : '发布'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
