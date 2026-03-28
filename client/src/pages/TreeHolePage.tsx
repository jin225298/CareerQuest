import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Heart, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { treeHoleApi, type TreeHolePost as TreeHolePostType } from '../lib/api';
import { TreeHolePost } from '../components/TreeHolePost';
import { CreatePostModal } from '../components/CreatePostModal';

const EMOTION_TABS = [
  { key: '', label: '全部', emoji: '🌈' },
  { key: 'joy', label: '喜悦', emoji: '😊' },
  { key: 'sad', label: '难过', emoji: '😢' },
  { key: 'hope', label: '期待', emoji: '🎯' },
  { key: 'anxiety', label: '焦虑', emoji: '😰' },
];

export function TreeHolePage() {
  const [posts, setPosts] = useState<TreeHolePostType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeEmotion, setActiveEmotion] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const fetchPosts = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPosts([]);
      setPage(0);
    }

    try {
      const skip = reset ? 0 : page * PAGE_SIZE;
      const response = await treeHoleApi.getPosts(skip, PAGE_SIZE, activeEmotion || undefined);
      
      if (reset) {
        setPosts(response.posts);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
        setPage(prev => prev + 1);
      }
      
      setTotal(response.total);
      setHasMore((reset ? response.posts.length : posts.length + response.posts.length) < response.total);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmotion]);

  const handleLike = async (postId: number, isLiked: boolean) => {
    try {
      if (isLiked) {
        await treeHoleApi.unlikePost(postId);
      } else {
        await treeHoleApi.likePost(postId);
      }
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              is_liked: !isLiked, 
              likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 
            } 
          : p
      ));
    } catch (err) {
      console.error('Failed to update like:', err);
    }
  };

  const handlePostCreated = () => {
    setShowCreateModal(false);
    fetchPosts(true);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      fetchPosts();
    }
  };

  return (
    <div className="min-h-screen text-gray-800" style={{ backgroundColor: '#e8f4fc' }}>
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-800">🌳 情绪树洞</h1>
          </div>
          
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {EMOTION_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveEmotion(tab.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${
                  activeEmotion === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className="mr-1">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div 
        className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24 h-[calc(100vh-140px)] overflow-y-auto"
        onScroll={handleScroll}
      >
        <AnimatePresence>
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <TreeHolePost post={post} onLike={handleLike} />
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🌱</div>
            <p>还没有内容</p>
            <p className="text-sm mt-2">成为第一个分享心情的人吧</p>
          </div>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-400 rounded-full shadow-lg flex items-center justify-center transition-colors z-30 text-white"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handlePostCreated}
      />
    </div>
  );
}
