import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Star, Calendar, Play, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface ReportSummary {
  report_id: string;
  overall_grade: string;
  dimensions: Record<string, { score: number; comment: string }>;
}

interface InterviewHistoryItem {
  session_id: string;
  type: string;
  difficulty: string;
  position: string | null;
  score: number | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
  report: ReportSummary | null;
}

interface InterviewHistoryData {
  interviews: InterviewHistoryItem[];
  total: number;
}

const typeLabels: Record<string, string> = {
  behavioral: '行为面试',
  technical: '技术面试',
  case: '案例面试',
};

const difficultyColors: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/20',
  hard: 'text-red-400 bg-red-400/20',
};

const gradeColors: Record<string, string> = {
  'A+': 'text-yellow-400',
  A: 'text-green-400',
  'A-': 'text-green-400',
  'B+': 'text-blue-400',
  B: 'text-blue-400',
  'B-': 'text-blue-400',
  'C+': 'text-yellow-400',
  C: 'text-yellow-400',
  'C-': 'text-yellow-400',
  D: 'text-red-400',
};

const dimensionLabels: Record<string, string> = {
  expression: '表达',
  logic: '逻辑',
  professional: '专业',
  adaptability: '应变',
  emotion: '情绪',
};

export function InterviewHistoryPage() {
  const [data, setData] = useState<InterviewHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const result = await api.get<InterviewHistoryData>('/interviews/history');
      setData(result);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGradeColor = (grade: string) => {
    return gradeColors[grade] || 'text-gray-400';
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/report/${reportId}`);
  };

  return (
    <div className="min-h-screen bg-pixel-bg p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-pixel-secondary rounded-xl flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>
          </Link>
          <h1 className="font-pixel text-xl text-white">面试记录</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-pixel-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.interviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-pixel-secondary rounded-full flex items-center justify-center">
              <Play className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-gray-400 font-pixel text-sm">还没有面试记录</p>
            <p className="text-gray-500 text-xs mt-2">开始你的第一次面试吧！</p>
            <Link to="/survey">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-6 px-6 py-3 bg-pixel-accent text-white rounded-xl font-pixel text-sm"
              >
                开始面试
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {data.interviews.map((item, index) => (
              <motion.div
                key={item.session_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-pixel-secondary rounded-xl p-4 border border-white/5 ${
                  item.report ? 'cursor-pointer hover:border-pixel-accent/30' : ''
                }`}
                onClick={() => item.report && handleViewReport(item.report.report_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-pixel text-white text-sm">
                        {typeLabels[item.type] || item.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-pixel ${difficultyColors[item.difficulty] || 'text-gray-400 bg-gray-400/20'}`}>
                        {item.difficulty}
                      </span>
                      {item.report && (
                        <span className={`px-2 py-0.5 rounded text-xs font-pixel ${getGradeColor(item.report.overall_grade)}`}>
                          {item.report.overall_grade}
                        </span>
                      )}
                    </div>
                    
                    {item.position && (
                      <p className="text-gray-400 text-xs mb-2">{item.position}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(item.duration_seconds)}</span>
                      </div>
                    </div>

                    {item.report && item.report.dimensions && (
                      <div className="flex items-center gap-2 mt-3">
                        {Object.entries(item.report.dimensions).slice(0, 5).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">{dimensionLabels[key] || key}:</span>
                            <span className={`text-xs font-pixel ${val.score >= 80 ? 'text-green-400' : val.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {val.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.score !== null && (
                      <div className="flex items-center gap-1 bg-yellow-400/20 px-3 py-1 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="font-pixel text-yellow-400">{item.score.toFixed(0)}</span>
                      </div>
                    )}
                    {item.report && (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
