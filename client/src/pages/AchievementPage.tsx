import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Flame, Zap, Clock, MessageCircle, Shield, Calendar, Award, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { achievementApi } from '../lib/api';
import { AchievementModal } from '../components/achievement/AchievementModal';

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic';
  reward_power: number;
  reward_mood: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

interface AchievementsData {
  achievements: Achievement[];
  total_count: number;
  unlocked_count: number;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  trophy: Trophy,
  briefcase: Award,
  award: Award,
  star: Star,
  flame: Flame,
  zap: Zap,
  clock: Clock,
  'message-circle': MessageCircle,
  shield: Shield,
  calendar: Calendar,
};

const rarityStyles = {
  common: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-400',
    text: 'text-gray-300',
    glow: '',
  },
  rare: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-400',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/20',
  },
  epic: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-400',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/30',
  },
};

export function AchievementPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const result = await achievementApi.getAchievements() as AchievementsData;
      setData(result);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Trophy;
    return Icon;
  };

  const filteredAchievements = data?.achievements.filter((a) => {
    if (filter === 'unlocked') return a.is_unlocked;
    if (filter === 'locked') return !a.is_unlocked;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-pixel-bg">
      <div className="bg-pixel-primary border-b border-pixel-secondary p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-pixel text-lg text-pixel-accent">成就</h1>
          {data && (
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
              <span>{data.unlocked_count}/{data.total_count}</span>
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pixel-accent transition-all"
                  style={{ width: `${(data.unlocked_count / data.total_count) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-6">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-pixel-accent text-white'
                  : 'bg-pixel-secondary text-gray-300 hover:bg-pixel-accent/20'
              }`}
            >
              {f === 'all' ? '全部' : f === 'unlocked' ? '已解锁' : '未解锁'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-pixel-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredAchievements?.map((achievement, index) => {
                const Icon = getIcon(achievement.icon);
                const styles = rarityStyles[achievement.rarity];
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedAchievement(achievement)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                      achievement.is_unlocked
                        ? `${styles.bg} ${styles.border} ${styles.glow} shadow-lg`
                        : 'bg-gray-800/50 border-gray-700 opacity-60'
                    }`}
                  >
                    {!achievement.is_unlocked && (
                      <div className="absolute inset-0 bg-gray-900/40 rounded-xl" />
                    )}
                    
                    <div className="flex items-start gap-4 relative">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        achievement.is_unlocked ? styles.bg : 'bg-gray-700'
                      }`}>
                        <Icon className={`w-6 h-6 ${achievement.is_unlocked ? styles.text : 'text-gray-500'}`} />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className={`font-medium mb-1 ${achievement.is_unlocked ? 'text-white' : 'text-gray-400'}`}>
                          {achievement.name}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                        
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-400">+{achievement.reward_power} 武力</span>
                          <span className="text-pink-400">+{achievement.reward_mood} 心情</span>
                          {achievement.is_unlocked && achievement.unlocked_at && (
                            <span className="text-gray-500 ml-auto">
                              {formatDate(achievement.unlocked_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AchievementModal
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
    </div>
  );
}
