import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, XCircle } from 'lucide-react';
import { friendApi, type FriendRequest } from '../lib/api';

interface FriendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestHandled: () => void;
}

export function FriendRequestModal({ isOpen, onClose, onRequestHandled }: FriendRequestModalProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await friendApi.getRequests('received');
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const handleAccept = async (id: string) => {
    setProcessing(id);
    try {
      await friendApi.acceptRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      onRequestHandled();
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await friendApi.rejectRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to reject request:', err);
    } finally {
      setProcessing(null);
    }
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
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-medium">好友请求</h2>
              <button onClick={onClose} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-4xl mb-2">📭</p>
                  <p>暂无好友请求</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map(request => (
                    <div
                      key={request.id}
                      className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                        {request.from_user.nickname?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {request.from_user.nickname}
                        </p>
                        {request.message && (
                          <p className="text-sm text-gray-500 truncate">{request.message}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAccept(request.id)}
                          disabled={processing === request.id}
                          className="p-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleReject(request.id)}
                          disabled={processing === request.id}
                          className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </motion.button>
                      </div>
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
