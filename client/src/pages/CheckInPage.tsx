import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Calendar, Flame, Trophy, ArrowLeft, ChevronLeft, ChevronRight, 
  Check, Crown
} from 'lucide-react';
import { checkinApi } from '../lib/api';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  streak_days: number;
  total_check_ins: number;
  rank: number;
}

export function CheckInPage() {
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth() + 1);
  const [checkInDates, setCheckInDates] = useState<string[]>([]);
  const [streakInfo, setStreakInfo] = useState({ current: 0, longest: 0, total: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchCalendar = useCallback(async () => {
    try {
      const [calendarData, streakData, todayData] = await Promise.all([
        checkinApi.getCalendar(calendarYear, calendarMonth),
        checkinApi.getStreak(),
        checkinApi.getToday()
      ]);
      setCheckInDates(calendarData?.check_ins?.map((c: {date: string}) => c.date) || []);
      setStreakInfo({
        current: streakData.current_streak || 0,
        longest: streakData.longest_streak || 0,
        total: streakData.total_check_ins || 0
      });
      setCheckedIn(todayData.checked_in || false);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    }
  }, [calendarYear, calendarMonth]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await checkinApi.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    fetchLeaderboard();
  }, [fetchCalendar, fetchLeaderboard]);

  const handleCheckIn = async () => {
    if (checkedIn || checking) return;
    setChecking(true);
    try {
      await checkinApi.checkIn({ mood: 'good' });
      setCheckedIn(true);
      setStreakInfo(prev => ({ ...prev, current: prev.current + 1, total: prev.total + 1 }));
      fetchCalendar();
    } catch (err) {
      console.error('Failed to check in:', err);
    } finally {
      setChecking(false);
    }
  };

  const getDaysInMonth = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    const days: Array<{ day: number; date: string }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: 0, date: '' });
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, date: `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
    }
    return days;
  };

  const days = getDaysInMonth();
  const isToday = (day: number) => day === today.getDate() && calendarMonth === today.getMonth() + 1 && calendarYear === today.getFullYear();

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-600 border border-yellow-300';
      case 2: return 'bg-gray-100 text-gray-600 border border-gray-300';
      case 3: return 'bg-orange-100 text-orange-600 border border-orange-300';
      default: return 'bg-gray-50 text-gray-500';
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
          <Calendar className="w-6 h-6 text-green-500" />
        </div>

        <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-800">打卡</h1>
            <div className="w-9" />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-orange-600">{streakInfo.current}</p>
              <p className="text-xs text-orange-500">连续打卡</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center">
              <Calendar className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-600">{streakInfo.total}</p>
              <p className="text-xs text-green-500">累计打卡</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center">
              <Trophy className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-purple-600">{streakInfo.longest}</p>
              <p className="text-xs text-purple-500">最长连续</p>
            </div>
          </div>

          <button
            onClick={handleCheckIn}
            disabled={checkedIn || checking}
            className={`w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all ${
              checkedIn 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gradient-to-r from-orange-400 to-red-500 text-white hover:shadow-lg active:scale-98'
            }`}
          >
            {checking ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : checkedIn ? (
              <>
                <Check className="w-5 h-5" />
                <span className="font-medium">今日已打卡</span>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5" />
                <span className="font-medium">立即打卡</span>
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => {
                  if (calendarMonth === 1) { setCalendarYear(y => y - 1); setCalendarMonth(12); }
                  else setCalendarMonth(m => m - 1);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <h3 className="font-medium text-gray-800 text-sm">{calendarYear}年{calendarMonth}月</h3>
              <button
                onClick={() => {
                  if (calendarMonth === 12) { setCalendarYear(y => y + 1); setCalendarMonth(1); }
                  else setCalendarMonth(m => m + 1);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs text-gray-400 py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => {
                const hasCheckIn = d.date && checkInDates.includes(d.date);
                return (
                  <div
                    key={i}
                    className={`relative aspect-square flex items-center justify-center rounded text-xs ${
                      d.day === 0 ? '' : isToday(d.day) ? 'bg-blue-100 ring-1 ring-blue-300' : ''
                    } ${hasCheckIn ? 'bg-green-100' : ''}`}
                  >
                    {d.day > 0 && (
                      <>
                        <span className={hasCheckIn ? 'text-green-700 font-medium' : 'text-gray-600'}>{d.day}</span>
                        {hasCheckIn && (
                          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-1.5 h-1.5 text-white" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">排行榜</span>
            </div>
            <div className="space-y-1.5">
              {leaderboard.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-2">暂无数据</p>
              ) : (
                leaderboard.slice(0, 10).map((entry) => (
                  <div
                    key={entry.user_id}
                    className="flex items-center gap-2 p-1.5 bg-white rounded-lg"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${getRankStyle(entry.rank)}`}>
                      {entry.rank}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {entry.nickname?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{entry.nickname}</p>
                    </div>
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame className="w-3 h-3" />
                      <span className="text-xs font-bold">{entry.streak_days}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
