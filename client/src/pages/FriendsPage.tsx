import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Users, UserPlus, Bell, ArrowLeft, Loader2, MessageCircle,
  UserCheck, UserX, Target, Trophy
} from 'lucide-react';
import { friendApi, type Friend, type CompareResult } from '../lib/api';
import { CompareResultModal } from '../components/CompareResultModal';

export function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{user_id: string; nickname: string}>>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<{id: number; from_user_id: string; from_nickname: string}>>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [compareData, setCompareData] = useState<{ friend: Friend; data: CompareResult } | null>(null);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await friendApi.getFriends();
      setFriends(data);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const data = await friendApi.getRequests('received');
      setPendingRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, [fetchFriends, fetchPendingRequests]);

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    try {
      const results = await friendApi.searchUsers(searchKeyword);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await friendApi.sendRequest({ to_user_id: userId });
      setShowSearch(false);
      setSearchKeyword('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await friendApi.acceptRequest(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      fetchFriends();
    } catch (err) {
      console.error('Failed to accept:', err);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await friendApi.rejectRequest(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleCompare = async (friend: Friend) => {
    try {
      const data = await friendApi.compareWithFriend(friend.id);
      setCompareData({ friend, data });
    } catch (err) {
      console.error('Failed to compare:', err);
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    if (!confirm('确定要删除这个好友吗？')) return;
    try {
      await friendApi.deleteFriend(friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={{ backgroundColor: '#e8f4fc' }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 right-20 text-6xl animate-pulse">✦</div>
        <div className="absolute bottom-40 left-20 text-3xl">✦</div>
        <div className="absolute bottom-20 right-32 text-5xl animate-pulse" style={{ animationDelay: '0.5s' }}>✦</div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-xl max-h-[85vh] bg-white/80 backdrop-blur-sm rounded-3xl border-4 border-white shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="absolute -top-3 -right-3 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center z-10">
          <Users className="w-6 h-6 text-rose-500" />
        </div>

        <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-800">好友</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors"
              >
                <UserPlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowRequests(true)}
                className="relative p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-3 text-center">
              <Users className="w-5 h-5 text-rose-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-rose-600">{friends.length}</p>
              <p className="text-xs text-rose-500">好友</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center">
              <Target className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-blue-600">{friends.filter(f => f.avg_score > 80).length}</p>
              <p className="text-xs text-blue-500">高手好友</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 text-center">
              <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-600">{pendingRequests.length}</p>
              <p className="text-xs text-amber-500">待处理</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">好友列表</span>
            <span className="text-xs text-gray-400">共 {friends.length} 人</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-gray-500 text-sm mb-3">还没有好友</p>
              <button
                onClick={() => setShowSearch(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm transition-colors"
              >
                添加好友
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {friend.nickname?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{friend.nickname}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>面试 {friend.interview_count || 0} 次</span>
                      <span>·</span>
                      <span>平均分 {friend.avg_score || 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCompare(friend)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                      title="对比成绩"
                    >
                      <Target className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFriend(friend.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      title="删除好友"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center p-6 z-10"
              onClick={() => { setShowSearch(false); setSearchResults([]); }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-2xl p-4 w-full max-w-sm"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="font-medium text-gray-800 mb-3">搜索用户</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    placeholder="输入用户昵称..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm transition-colors"
                  >
                    搜索
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">输入关键词搜索用户</p>
                  ) : (
                    searchResults.map(user => (
                      <div key={user.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {user.nickname?.charAt(0) || 'U'}
                          </div>
                          <span className="text-sm text-gray-700">{user.nickname}</span>
                        </div>
                        <button
                          onClick={() => handleSendRequest(user.user_id)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded text-xs transition-colors"
                        >
                          添加
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {showRequests && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center p-6 z-10"
              onClick={() => setShowRequests(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-2xl p-4 w-full max-w-sm"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="font-medium text-gray-800 mb-3">好友请求</h3>
                {pendingRequests.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">暂无好友请求</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            {req.from_nickname?.charAt(0) || 'U'}
                          </div>
                          <span className="text-sm text-gray-700">{req.from_nickname}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-1.5 bg-green-500 hover:bg-green-400 text-white rounded transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="p-1.5 bg-red-500 hover:bg-red-400 text-white rounded transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <CompareResultModal
        isOpen={!!compareData}
        onClose={() => setCompareData(null)}
        friendName={compareData?.friend.nickname || ''}
        data={compareData?.data || null}
      />
    </div>
  );
}
