import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Trophy,
  Save,
  ClipboardList,
  Brain,
  Heart,
  Image,
  Settings,
  PlayCircle,
  X,
  MessageCircle,
  CheckCircle2,
  Phone,
  TreeDeciduous,
  Users,
  Flame
} from 'lucide-react';
import { api, userApi, avatarApi, taskApi, type DailyTask, type CompleteTaskResponse } from '../lib/api';
import type { UserTag } from '../lib/api';
import { UserStatsModal } from '../components/UserStatsModal';
import { RewardPopup } from '../components/RewardPopup';

interface UserData {
  id: string;
  nickname: string;
  power: number;
  mood: number;
  hp: number;
  wins: number;
}

interface UserStatsData {
  total_interviews: number;
  avg_score: number;
  highest_score: number;
  streak_days: number;
}

interface UserStatus {
  is_profile_completed: boolean;
}

interface EmotionData {
  preview_url: string;
  sprite_url: string;
}

const getTagStyle = (type: string) => {
  switch (type) {
    case 'career':
      return 'bg-blue-500/80 text-white';
    case 'experience':
      return 'bg-green-500/80 text-white';
    case 'target':
      return 'bg-purple-500/80 text-white';
    case 'status':
      return 'bg-orange-500/80 text-white';
    case 'goal':
      return 'bg-pink-500/80 text-white';
    case 'weakness':
      return 'bg-red-500/80 text-white';
    case 'industry':
      return 'bg-cyan-500/80 text-white';
    case 'company':
      return 'bg-amber-500/80 text-white';
    default:
      return 'bg-slate-500/80 text-white';
  }
};

const getEmotionByMood = (mood: number): 'happy' | 'sad' | 'excited' => {
  if (mood < 30) return 'sad';
  if (mood <= 70) return 'happy';
  return 'excited';
};

const getEmotionEmoji = (emotion: 'happy' | 'sad' | 'excited'): string => {
  switch (emotion) {
    case 'happy':
      return '😊';
    case 'sad':
      return '😢';
    case 'excited':
      return '🎉';
    default:
      return '😊';
  }
};

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStatsData | null>(null);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [emotionData, setEmotionData] = useState<EmotionData | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<'happy' | 'sad' | 'excited'>('happy');
  
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showCharModal, setShowCharModal] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [completingTask, setCompletingTask] = useState<number | null>(null);
  const [rewardData, setRewardData] = useState<CompleteTaskResponse | null>(null);

  const fetchUserData = async () => {
    try {
      const [user, stats, status, profileData] = await Promise.all([
        api.get<UserData>('/users/me'),
        api.get<UserStatsData>('/users/me/stats'),
        userApi.getStatus(),
        userApi.getProfile().catch(() => null),
      ]);
      setUserData(user);
      setUserStats(stats);
      setUserStatus(status);
      if (profileData) {
        setUserTags(profileData.tags);
      }
      if (!status.is_profile_completed) {
        setShowGuide(true);
      }

      const emotion = getEmotionByMood(user.mood);
      setCurrentEmotion(emotion);

      try {
        const emotionResponse = await avatarApi.getEmotion(user.id);
        if (emotionResponse) {
          setEmotionData({
            preview_url: emotionResponse.preview_url,
            sprite_url: emotionResponse.sprite_url,
          });
        }
      } catch {
        console.log('No emotion avatar found, using default');
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, (location.state as { profileUpdated?: boolean })?.profileUpdated]);

  useEffect(() => {
    if (userData) {
      const emotion = getEmotionByMood(userData.mood);
      setCurrentEmotion(emotion);
    }
  }, [userData]);

  const fetchTasks = async () => {
    setTaskLoading(true);
    try {
      const data = await taskApi.getDailyTasks();
      setDailyTasks(data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setTaskLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    setCompletingTask(taskId);
    try {
      const result = await taskApi.completeTask(taskId);
      setRewardData(result);
      setDailyTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, is_completed: true } : t))
      );
      fetchUserData();
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setCompletingTask(null);
    }
  };

  const getTaskProgress = (task: DailyTask) => {
    return Math.min((task.current_count / task.target_count) * 100, 100);
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

  const stats = {
    power: userData?.power ?? 50,
    mood: userData?.mood ?? 70,
    hp: userData?.hp ?? 100,
    wins: userData?.wins ?? 0,
    totalInterviews: userStats?.total_interviews ?? 0,
    avgScore: userStats?.avg_score ?? 0,
  };
  
  const stressLevel = 0;

  const avatarSrc = emotionData?.sprite_url 
    ? `http://localhost:8000${emotionData.sprite_url}`
    : '/avatar.gif';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 right-20 text-6xl animate-pulse">✦</div>
        <div className="absolute top-32 right-40 text-2xl">✦</div>
        <div className="absolute top-20 left-32 text-4xl animate-pulse" style={{ animationDelay: '1s' }}>☾</div>
        <div className="absolute bottom-40 left-20 text-3xl">✦</div>
        <div className="absolute bottom-20 right-32 text-5xl animate-pulse" style={{ animationDelay: '0.5s' }}>✦</div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-xl aspect-square bg-white/5 backdrop-blur-sm rounded-3xl border-4 border-white/10 shadow-2xl"
      >
        <div className="absolute -top-3 -right-3 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
        </div>

        <div className="absolute top-6 left-6 space-y-3">
          <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
            <Brain className="w-5 h-5 text-pink-400" />
            <div className="w-20 h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${stats.power}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
            <span className="text-xs font-pixel text-gray-300">{stats.power}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <div className="w-20 h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-pink-400"
                initial={{ width: 0 }}
                animate={{ width: `${stats.mood}%` }}
                transition={{ duration: 1, delay: 0.4 }}
              />
            </div>
            <span className="text-xs font-pixel text-gray-300">{stats.mood}</span>
          </div>

          <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1">
            <span className="text-lg">{getEmotionEmoji(currentEmotion)}</span>
            <span className="text-xs text-gray-300 capitalize">{currentEmotion}</span>
          </div>

          {userTags.length > 0 && (
            <div className="flex flex-wrap gap-1 max-w-32 bg-black/30 rounded-lg px-2 py-1.5">
              {userTags.slice(0, 4).map((tag) => (
                <span
                  key={tag.tag_key}
                  className={`px-2 py-0.5 rounded-full text-xs ${getTagStyle(tag.tag_type)}`}
                >
                  {tag.tag_value}
                </span>
              ))}
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowTaskPanel(true);
            fetchTasks();
          }}
          className="absolute top-6 left-1/2 -translate-x-1/2 bg-pink-500/20 hover:bg-pink-500/30 p-3 rounded-xl transition-colors group"
        >
          <ClipboardList className="w-6 h-6 text-pink-400" />
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-pixel text-pink-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            TASKS
          </span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
        </motion.button>

        <div className="absolute left-4 top-1/2 -translate-y-1/2 space-y-3 z-10">
          <Link to="/friends">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.1, x: 5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <Users className="w-6 h-6 text-rose-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                好友
              </span>
            </motion.div>
          </Link>

          <Link to="/checkin">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.1, x: 5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <Flame className="w-6 h-6 text-orange-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                打卡
              </span>
            </motion.div>
          </Link>
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-3 z-10">
          <button
            onClick={() => {
              console.log('CHAR clicked');
              setShowCharModal(true);
            }}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group"
          >
            <User className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
              CHAR
            </span>
          </button>

          <Link to="/achievements">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.1, x: -5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                WINS
              </span>
            </motion.div>
          </Link>

          <Link to="/interviews/history">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              whileHover={{ scale: 1.1, x: -5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <Save className="w-6 h-6 text-purple-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                MEMORY
              </span>
            </motion.div>
          </Link>

          <Link to="/avatar">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.1, x: -5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <Image className="w-6 h-6 text-cyan-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                AVATAR
              </span>
            </motion.div>
          </Link>

          <Link to="/resume">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{ scale: 1.1, x: -5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <ClipboardList className="w-6 h-6 text-indigo-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                简历
              </span>
            </motion.div>
          </Link>

          <Link to="/voice-interview">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.1, x: -5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <Phone className="w-6 h-6 text-teal-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                VOICE
              </span>
            </motion.div>
          </Link>

          <Link to="/tree-hole">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.1, x: -5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <TreeDeciduous className="w-6 h-6 text-emerald-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                树洞
              </span>
            </motion.div>
          </Link>

          <Link to="/profile">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.1, x: -5 }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <Settings className="w-6 h-6 text-gray-500" />
              <span className="text-xs font-pixel text-gray-600 group-hover:text-gray-800 transition-colors">
                设置
              </span>
            </motion.div>
          </Link>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Link to="/avatar" className="relative group pointer-events-auto">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <img 
                src={avatarSrc} 
                alt="Avatar" 
                className="w-40 h-40 object-contain pixelated transition-all group-hover:opacity-80"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute -top-2 -right-2 text-2xl">
                {getEmotionEmoji(currentEmotion)}
              </div>
              {stressLevel > 50 && (
                <motion.div
                  className="absolute top-0 right-0"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <span className="text-2xl">💦</span>
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-white text-sm font-pixel">自定义头像</span>
              </motion.div>
            </motion.div>
          </Link>
        </div>

        <Link
          to="/interview"
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-2xl shadow-lg flex items-center justify-center transition-all"
          >
            <PlayCircle className="w-10 h-10 text-white" />
          </motion.button>
          <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-pixel text-gray-600 whitespace-nowrap">
            开始面试
          </p>
        </Link>

        <div className="absolute bottom-8 left-8 flex items-center gap-2">
          <Link to="/achievements" className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center hover:bg-yellow-200 transition-colors">
            <Trophy className="w-4 h-4 text-yellow-600" />
          </Link>
          <Link to="/achievements" className="text-xs font-pixel text-yellow-600 hover:text-yellow-500 transition-colors">
            {stats.wins} WINS
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6"
      >
        <h1 className="font-pixel text-lg text-pixel-accent tracking-wider">
          面试修炼手册
        </h1>
      </motion.div>

      <UserStatsModal
        isOpen={showStatsModal || showCharModal}
        onClose={() => {
          setShowStatsModal(false);
          setShowCharModal(false);
        }}
        stats={stats}
      />

      {showTaskPanel && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setShowTaskPanel(false)}>
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-white" />
                  <h2 className="font-pixel text-sm text-white">每日任务</h2>
                </div>
                <button onClick={() => setShowTaskPanel(false)} className="text-white/70 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <Link
                to="/ai-chat"
                onClick={() => setShowTaskPanel(false)}
                className="m-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 hover:bg-blue-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 text-sm font-medium">与导师对话</p>
                  <p className="text-gray-500 text-xs">获取个性化任务推荐</p>
                </div>
              </Link>

              {taskLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {dailyTasks.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>暂无任务</p>
                      <Link to="/ai-chat" className="text-blue-500 text-sm mt-2 block">与导师对话获取任务</Link>
                    </div>
                  ) : (
                    dailyTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`bg-white rounded-lg p-3 border shadow-sm transition-all ${
                          task.is_completed ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{getTaskTypeIcon(task.task_type)}</span>
                          <div className="flex-1">
                            <p className={`text-sm ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {task.description}
                            </p>

                            {!task.is_completed && (
                              <div className="mt-2">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${getTaskProgress(task)}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1 text-xs text-gray-400">
                                  <span>{task.current_count}/{task.target_count}</span>
                                </div>
                              </div>
                            )}

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-green-500">+{task.reward_power}</span>
                                <span className="text-pink-500">+{task.reward_mood}</span>
                              </div>

                              {!task.is_completed && task.current_count >= task.target_count && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={completingTask === task.id}
                                  className="px-3 py-1 bg-green-500 hover:bg-green-400 text-white rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  {completingTask === task.id ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      完成
                                    </>
                                  )}
                                </motion.button>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {task.is_completed && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <RewardPopup
        isOpen={!!rewardData}
        onClose={() => setRewardData(null)}
        powerGained={rewardData?.power_gained ?? 0}
        moodGained={rewardData?.mood_gained ?? 0}
        streakBonus={rewardData?.streak_bonus ?? 0}
        message={rewardData?.message}
      />

      <AnimatePresence>
        {showGuide && userStatus && !userStatus.is_profile_completed && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xl max-w-xs">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div className="flex-1">
                  <h3 className="text-gray-800 font-medium mb-1">完善求职画像</h3>
                  <p className="text-gray-500 text-sm mb-3">获得个性化推荐，提升求职效率</p>
                  <button
                    onClick={() => navigate('/survey')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    立即设置
                  </button>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
