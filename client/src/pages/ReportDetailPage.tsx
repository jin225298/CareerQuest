import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, TrendingUp, MessageSquare, Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import { reportApi } from '../lib/api';
import { AbilityRadar } from '../components/AbilityRadar';

interface DimensionAnalysis {
  score: number;
  analysis: string;
  suggestion: string;
}

interface QuestionAnalysis {
  question: string;
  score: number;
  strengths: string[];
  improvements: string[];
}

interface Report {
  id: string;
  session_id: string;
  overall_score: number;
  grade: string;
  overall_feedback: string;
  dimensions: {
    expression: number;
    logic: number;
    professional: number;
    adaptability: number;
    emotion: number;
  };
  dimension_analysis: {
    expression: DimensionAnalysis;
    logic: DimensionAnalysis;
    professional: DimensionAnalysis;
    adaptability: DimensionAnalysis;
    emotion: DimensionAnalysis;
  };
  question_analysis: QuestionAnalysis[];
  improvement_suggestions: string[];
  created_at: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  expression: '表达能力',
  logic: '逻辑思维',
  professional: '专业能力',
  adaptability: '应变能力',
  emotion: '情绪管理',
};

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) return;
      try {
        setLoading(true);
        const data = await reportApi.getReport(reportId);
        setReport(data as Report);
      } catch (err) {
        setError('加载报告失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId]);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-400';
    if (grade.startsWith('B')) return 'text-blue-400';
    if (grade.startsWith('C')) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pixel-primary">
        <div className="text-center">
          <div className="animate-pulse text-pixel-accent font-pixel text-lg mb-4">
            加载报告中...
          </div>
          <div className="w-16 h-2 bg-pixel-secondary rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-pixel-accent animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pixel-primary">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '报告不存在'}</p>
          <button onClick={() => navigate(-1)} className="pixel-button">
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pixel-primary to-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-pixel-secondary hover:bg-pixel-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="font-pixel text-xl text-pixel-accent">面试报告</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-pixel-secondary rounded-xl p-6 mb-6 border border-pixel-accent/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-sm text-gray-400">总分</div>
                <div className={`font-pixel text-3xl ${getScoreColor(report.overall_score)}`}>
                  {report.overall_score} 分
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">等级</div>
              <div className={`font-pixel text-3xl ${getGradeColor(report.grade)}`}>
                {report.grade}
              </div>
            </div>
          </div>
          <p className="text-gray-300">{report.overall_feedback}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-pixel-secondary rounded-xl p-6 mb-6 border border-pixel-accent/20"
        >
          <h2 className="font-pixel text-lg text-pixel-accent mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            能力分析
          </h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <AbilityRadar dimensions={report.dimensions} size={240} />
            </div>
            <div className="flex-1 space-y-4">
              {Object.entries(report.dimension_analysis).map(([key, analysis]) => (
                <div key={key} className="bg-pixel-primary/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">{DIMENSION_LABELS[key]}</span>
                    <span className={`font-pixel ${getScoreColor(analysis.score)}`}>
                      {analysis.score}分
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{analysis.analysis}</p>
                  <p className="text-sm text-blue-400">建议: {analysis.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-pixel-secondary rounded-xl p-6 mb-6 border border-pixel-accent/20"
        >
          <h2 className="font-pixel text-lg text-pixel-accent mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            问题分析
          </h2>
          <div className="space-y-4">
            {report.question_analysis.map((q, idx) => (
              <div key={idx} className="bg-pixel-primary/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-gray-300">Q{idx + 1}: {q.question}</span>
                  <span className={`font-pixel text-sm ${getScoreColor(q.score)}`}>
                    {q.score}分
                  </span>
                </div>
                {q.strengths.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-green-400">优点: </span>
                    <span className="text-xs text-gray-400">{q.strengths.join('、')}</span>
                  </div>
                )}
                {q.improvements.length > 0 && (
                  <div>
                    <span className="text-xs text-yellow-400">不足: </span>
                    <span className="text-xs text-gray-400">{q.improvements.join('、')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-pixel-secondary rounded-xl p-6 border border-pixel-accent/20"
        >
          <h2 className="font-pixel text-lg text-pixel-accent mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            改进建议
          </h2>
          <div className="space-y-3">
            {report.improvement_suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-pixel-primary/50 rounded-lg p-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pixel-accent/20 text-pixel-accent text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-gray-300">{suggestion}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
