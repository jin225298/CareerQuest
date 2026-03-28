import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, RotateCcw, Share2, Trophy, Star, Heart, Zap, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AbilityRadar } from '../components/AbilityRadar';
import { AchievementUnlockModal } from '../components/achievement/AchievementUnlockModal';
import { useState, useMemo } from 'react';
import { achievementApi, reportApi } from '../lib/api';

interface InterviewResult {
  score: number;
  dimensions: {
    expression: number;
    logic: number;
    professional: number;
    adaptability: number;
    emotion: number;
  };
  feedback: string;
  powerGained: number;
  moodGained: number;
  sessionId?: string;
  reportId?: string;
}

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic';
  reward_power: number;
  reward_mood: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function InterviewResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result: InterviewResult = location.state?.result;
  const messages: Message[] = location.state?.messages || [];
  const duration: number = location.state?.duration || 0;
  
  const unlockedAchievements = useMemo<Achievement[]>(() => {
    return location.state?.unlockedAchievements || [];
  }, [location.state?.unlockedAchievements]);
  
  const [showAchievementModal, setShowAchievementModal] = useState(unlockedAchievements.length > 0);
  const [reportId, setReportId] = useState<string | null>(result?.reportId || null);
  const [reportLoading, setReportLoading] = useState(false);

  const handleNotify = async (achievementId: number) => {
    try {
      await achievementApi.markAsNotified(achievementId);
    } catch (err) {
      console.error('Failed to mark achievement as notified:', err);
    }
  };

  const handleViewReport = async () => {
    if (reportId) {
      navigate(`/report/${reportId}`);
      return;
    }
    if (!result?.sessionId) {
      alert('无法获取面试记录');
      return;
    }
    
    setReportLoading(true);
    try {
      const data = await reportApi.getReportBySession(result.sessionId) as { report_id: string };
      if (data.report_id) {
        setReportId(data.report_id);
        navigate(`/report/${data.report_id}`);
      }
    } catch (err) {
      console.error('Failed to get report:', err);
      alert('报告生成中，请稍后再试');
    } finally {
      setReportLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pixel-primary">
        <div className="text-center">
          <p className="text-gray-400 mb-4">没有找到面试结果</p>
          <Link to="/" className="pixel-button">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return '太棒了！面试表现非常出色！';
    if (score >= 70) return '表现不错，继续保持！';
    if (score >= 50) return '还有进步空间，加油！';
    return '别灰心，多练习会更好！';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}分${secs}秒`;
  };

  const handleShare = () => {
    const shareText = `我在面试修炼手册中获得了 ${result.score} 分！\n表达能力: ${result.dimensions.expression}\n逻辑思维: ${result.dimensions.logic}\n专业能力: ${result.dimensions.professional}\n应变能力: ${result.dimensions.adaptability}\n情绪管理: ${result.dimensions.emotion}`;
    
    if (navigator.share) {
      navigator.share({
        title: '面试修炼手册 - 我的成绩',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('成绩已复制到剪贴板！');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pixel-primary to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-pixel text-2xl text-pixel-accent mb-2">面试结束</h1>
          <p className="text-gray-400">以下是你的面试表现</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-pixel-secondary rounded-xl p-6 mb-6 border border-pixel-accent/20"
        >
          <div className="text-center mb-6">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-3"
            >
              <img 
                src="/avatar.gif" 
                alt="Avatar" 
                className="w-20 h-20 object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            </motion.div>
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20 ml-2 align-top">
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
            <h2 className={`font-pixel text-4xl mb-2 ${getScoreColor(result.score)}`}>
              {result.score}
            </h2>
            <p className="text-gray-400">{getScoreMessage(result.score)}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-sm text-gray-400 mb-3 text-center">能力雷达图</h3>
            <AbilityRadar dimensions={result.dimensions} size={240} />
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {[
              { label: '表达', value: result.dimensions.expression, icon: Star },
              { label: '逻辑', value: result.dimensions.logic, icon: Zap },
              { label: '专业', value: result.dimensions.professional, icon: Trophy },
              { label: '应变', value: result.dimensions.adaptability, icon: Heart },
              { label: '情绪', value: result.dimensions.emotion, icon: Heart },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-lg font-pixel text-pixel-accent">{item.value}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-pixel-primary/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm text-gray-400 mb-2">面试官评语</h4>
            <p className="text-gray-200">{result.feedback}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-pixel-primary/50 rounded-lg p-3">
              <div className="text-lg font-pixel text-pixel-accent">{messages.length}</div>
              <div className="text-xs text-gray-500">对话轮数</div>
            </div>
            <div className="bg-pixel-primary/50 rounded-lg p-3">
              <div className="text-lg font-pixel text-pixel-accent">{formatDuration(duration)}</div>
              <div className="text-xs text-gray-500">面试时长</div>
            </div>
            <div className="bg-pixel-primary/50 rounded-lg p-3">
              <div className="text-lg font-pixel text-green-400">+{result.powerGained}</div>
              <div className="text-xs text-gray-500">武力值</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 mb-6"
        >
          <button
            onClick={handleViewReport}
            disabled={reportLoading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-400 rounded-lg transition-colors border border-purple-500/30 disabled:opacity-50"
          >
            <FileText size={20} />
            {reportLoading ? '报告生成中...' : '查看详细报告'}
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
            >
              <Share2 size={18} />
              分享成绩
            </button>
            <button
              onClick={() => navigate('/interview')}
              className="flex items-center justify-center gap-2 py-3 bg-pixel-accent/20 hover:bg-pixel-accent/30 text-pixel-accent rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
              再来一次
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            to="/"
            className="block text-center py-3 text-gray-400 hover:text-white transition-colors"
          >
            <Home size={18} className="inline mr-2" />
            返回首页
          </Link>
        </motion.div>
      </div>

      <AchievementUnlockModal
        achievements={showAchievementModal ? unlockedAchievements : []}
        onClose={() => setShowAchievementModal(false)}
        onNotify={handleNotify}
      />
    </div>
  );
}
