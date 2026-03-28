import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit2, Loader2, AlertCircle } from 'lucide-react';
import { userApi } from '../lib/api';
import type { UserProfile, UserTag } from '../lib/api';

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tags, setTags] = useState<UserTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userApi.getProfile();
        setProfile(data.profile);
        setTags(data.tags);
      } catch (err) {
        setError('加载用户画像失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const getTagStyle = (type: string) => {
    switch (type) {
      case 'career':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'experience':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'target':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'status':
        return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'goal':
        return 'bg-pink-100 text-pink-700 border border-pink-200';
      case 'weakness':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'industry':
        return 'bg-cyan-100 text-cyan-700 border border-cyan-200';
      case 'company':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="pixel-card text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-pixel-accent" />
          <p className="mt-4 text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="pixel-card text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
          <p className="mt-4 text-slate-500">{error}</p>
          <button
            onClick={() => navigate('/survey')}
            className="mt-4 pixel-button"
          >
            去设置画像
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="pixel-card">
          <div className="flex justify-between items-center mb-6">
            <h1 className="font-pixel text-xl text-pixel-accent">求职画像</h1>
            <button
              onClick={() => navigate('/survey')}
              className="flex items-center gap-2 px-3 py-1.5 bg-pixel-accent/20 hover:bg-pixel-accent/30 rounded-lg text-pixel-accent text-sm transition-colors"
            >
              <Edit2 size={14} />
              编辑
            </button>
          </div>

          <div className="space-y-4 border-b border-slate-200 pb-6 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">职业方向</span>
              <span className="text-slate-800 font-medium">{profile?.career || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">工作经验</span>
              <span className="text-slate-800 font-medium">{profile?.experience || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">目标岗位</span>
              <span className="text-slate-800 font-medium">{profile?.target_position || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">目标行业</span>
              <span className="text-slate-800 font-medium">{profile?.industry || '未设置'}</span>
            </div>
          </div>

          <div>
            <h2 className="text-slate-500 text-sm mb-3">我的标签</h2>
            <div className="flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span
                    key={tag.tag_key}
                    className={`px-3 py-1.5 rounded-full text-sm ${getTagStyle(tag.tag_type)}`}
                  >
                    {tag.tag_value}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-sm">暂无标签</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
