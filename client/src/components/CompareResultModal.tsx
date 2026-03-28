import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Heart, Trophy, Target } from 'lucide-react';
import type { CompareResult } from '../lib/api';

interface CompareResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  data: CompareResult | null;
}

const LABELS = ['表达', '逻辑', '专业', '应变', '情绪'];

export function CompareResultModal({ isOpen, onClose, friendName, data }: CompareResultModalProps) {
  const mePoints = useMemo(() => {
    if (!data) return [];
    const values = [
      data.me.dimensions.expression,
      data.me.dimensions.logic,
      data.me.dimensions.professional,
      data.me.dimensions.adaptability,
      data.me.dimensions.emotion,
    ];
    const size = 200;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 30;
    return values.map((v, i) => {
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const radius = (v / 100) * maxRadius;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [data]);

  const friendPoints = useMemo(() => {
    if (!data) return [];
    const values = [
      data.friend.dimensions.expression,
      data.friend.dimensions.logic,
      data.friend.dimensions.professional,
      data.friend.dimensions.adaptability,
      data.friend.dimensions.emotion,
    ];
    const size = 200;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 30;
    return values.map((v, i) => {
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const radius = (v / 100) * maxRadius;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [data]);

  const mePathD = mePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  const friendPathD = friendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const size = 200;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 30;

  if (!data) return null;

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-medium">成绩对比</h2>
              <button onClick={onClose} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <h3 className="font-medium text-blue-700 mb-2">我的数据</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Brain className="w-4 h-4 text-blue-500" /> 武力值
                      </span>
                      <span className="font-bold text-blue-600">{data.me.power}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Heart className="w-4 h-4 text-pink-500" /> 心情值
                      </span>
                      <span className="font-bold text-pink-600">{data.me.mood}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Target className="w-4 h-4 text-green-500" /> 面试次数
                      </span>
                      <span className="font-bold text-green-600">{data.me.total_interviews}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-yellow-500" /> 平均分
                      </span>
                      <span className="font-bold text-yellow-600">{data.me.avg_score.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-3">
                  <h3 className="font-medium text-purple-700 mb-2">{friendName}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Brain className="w-4 h-4 text-blue-500" /> 武力值
                      </span>
                      <span className="font-bold text-blue-600">{data.friend.power}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Heart className="w-4 h-4 text-pink-500" /> 心情值
                      </span>
                      <span className="font-bold text-pink-600">{data.friend.mood}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Target className="w-4 h-4 text-green-500" /> 面试次数
                      </span>
                      <span className="font-bold text-green-600">{data.friend.total_interviews}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-yellow-500" /> 平均分
                      </span>
                      <span className="font-bold text-yellow-600">{data.friend.avg_score.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-center font-medium text-gray-700 mb-3">能力对比雷达图</h3>
                <svg width={size} height={size} className="mx-auto">
                  <defs>
                    <linearGradient id="meGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
                    </linearGradient>
                    <linearGradient id="friendGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
                      <stop offset="100%" stopColor="rgba(168, 85, 247, 0.1)" />
                    </linearGradient>
                  </defs>

                  {[20, 40, 60, 80, 100].map(level => {
                    const radius = (level / 100) * maxRadius;
                    return (
                      <circle
                        key={level}
                        cx={centerX}
                        cy={centerY}
                        r={radius}
                        fill="none"
                        stroke="rgba(75, 85, 99, 0.2)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {[0, 1, 2, 3, 4].map(i => {
                    const angle = (i * 72 - 90) * (Math.PI / 180);
                    const endX = centerX + maxRadius * Math.cos(angle);
                    const endY = centerY + maxRadius * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1={centerX}
                        y1={centerY}
                        x2={endX}
                        y2={endY}
                        stroke="rgba(75, 85, 99, 0.2)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  <path d={friendPathD} fill="url(#friendGradient)" stroke="rgb(168, 85, 247)" strokeWidth="2" />
                  <path d={mePathD} fill="url(#meGradient)" stroke="rgb(59, 130, 246)" strokeWidth="2" />

                  {LABELS.map((label, i) => {
                    const angle = (i * 72 - 90) * (Math.PI / 180);
                    const labelRadius = maxRadius + 20;
                    const x = centerX + labelRadius * Math.cos(angle);
                    const y = centerY + labelRadius * Math.sin(angle);
                    return (
                      <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 text-xs">
                        {label}
                      </text>
                    );
                  })}
                </svg>

                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-600">我</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-sm text-gray-600">{friendName}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
