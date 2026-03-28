import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { checkinApi, type CalendarData } from '../lib/api';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CheckInCalendarProps {
  onMonthChange?: (year: number, month: number) => void;
}

export function CheckInCalendar({ onMonthChange }: CheckInCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);

  const checkInList = calendarData?.check_ins || [];
  const checkInMap = new Map(
    checkInList.map(c => [c.date, c.mood])
  );

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await checkinApi.getCalendar(year, month);
      setCalendarData(data);
      onMonthChange?.(year, month);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month, onMonthChange]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const getDaysInMonth = () => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const days: Array<{ day: number; date: string; isCurrentMonth: boolean }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: 0, date: '', isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, date: dateStr, isCurrentMonth: true });
    }

    return days;
  };

  const days = getDaysInMonth();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() + 1 &&
    year === today.getFullYear();

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </motion.button>
        <h3 className="font-medium text-gray-800">
          {year}年{month}月
        </h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </motion.button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const mood = d.date ? checkInMap.get(d.date) : undefined;
            const hasCheckIn = !!mood;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className={`
                  relative aspect-square flex items-center justify-center rounded-lg text-sm
                  ${d.day === 0 ? '' : isToday(d.day) ? 'bg-blue-50 ring-2 ring-blue-300' : ''}
                  ${hasCheckIn ? 'bg-green-50' : ''}
                `}
              >
                {d.day > 0 && (
                  <>
                    <span className={hasCheckIn ? 'text-green-700 font-medium' : 'text-gray-700'}>
                      {d.day}
                    </span>
                    {hasCheckIn && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {calendarData && checkInList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            本月打卡 <span className="font-bold text-green-600">{checkInList.length}</span> 天
          </p>
        </div>
      )}
    </div>
  );
}
