import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { friendApi, type SearchResult } from '../lib/api';

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSent: () => void;
}

export function SearchUserModal({ isOpen, onClose, onRequestSent }: SearchUserModalProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const data = await friendApi.searchUsers(keyword.trim());
      setResults(data);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setSending(userId);
    try {
      await friendApi.sendRequest({ to_user_id: userId });
      setSentIds(prev => new Set(prev).add(userId));
      onRequestSent();
    } catch (err) {
      console.error('Failed to send request:', err);
    } finally {
      setSending(null);
    }
  };

  const handleClose = () => {
    setKeyword('');
    setResults([]);
    setSentIds(new Set());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="bg-purple-500 px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-medium">添加好友</h2>
              <button onClick={handleClose} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="输入昵称搜索..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto px-4 pb-4">
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-4xl mb-2">🔍</p>
                  <p>搜索用户添加好友</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map(user => (
                    <div
                      key={user.id}
                      className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                        {user.nickname?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{user.nickname}</p>
                        {user.is_friend && (
                          <span className="text-xs text-green-500">已是好友</span>
                        )}
                      </div>
                      {!user.is_friend && !user.has_pending_request && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSendRequest(user.id)}
                          disabled={sending === user.id || sentIds.has(user.id)}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {sending === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : sentIds.has(user.id) ? (
                            '已发送'
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              添加
                            </>
                          )}
                        </motion.button>
                      )}
                      {user.has_pending_request && !sentIds.has(user.id) && (
                        <span className="text-sm text-gray-400">请求中</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
