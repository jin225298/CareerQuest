import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Gift, X } from 'lucide-react';
import { api } from '../lib/api';

interface Task {
  id: number;
  user_id: string;
  task_type: string;
  description: string;
  target_count: number;
  current_count: number;
  reward_power: number;
  reward_mood: number;
  is_completed: boolean;
  task_date: string;
  created_at: string;
  completed_at: string | null;
}

interface DailyTasksData {
  tasks: Task[];
  total_completed: number;
  total_tasks: number;
  power_reward: number;
  mood_reward: number;
}

interface DailyTaskPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function DailyTaskPanel({ isOpen, onClose, className = '' }: DailyTaskPanelProps) {
  const [tasks, setTasks] = useState<DailyTasksData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get<DailyTasksData>('/tasks/daily');
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (task: Task) => {
    return Math.min((task.current_count / task.target_count) * 100, 100);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'interview':
        return '🎤';
      case 'survey':
        return '📝';
      case 'login':
        return '✨';
      case 'review':
        return '🎬';
      default:
        return '📌';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-y-0 right-0 w-80 bg-pixel-secondary border-l border-pixel-accent/30 shadow-xl z-50 ${className}`}
      >
        <div className="h-full flex flex-col">
          <div className="bg-pixel-accent/20 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pixel-accent" />
              <h2 className="font-pixel text-lg text-white">每日任务</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-pixel-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tasks ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-pixel-primary rounded-lg p-3 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">完成进度</span>
                  <span className="text-pixel-accent font-medium">
                    {tasks.total_completed}/{tasks.total_tasks}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-pixel-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${(tasks.total_completed / tasks.total_tasks) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                {tasks.total_completed > 0 && (
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="text-green-400">+{tasks.power_reward} 武力</span>
                    <span className="text-pink-400">+{tasks.mood_reward} 心情</span>
                  </div>
                )}
              </div>

              {tasks.tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-pixel-primary rounded-lg p-3 border transition-all ${
                    task.is_completed ? 'border-green-500/30' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getTypeIcon(task.task_type)}</span>
                    <div className="flex-1">
                      <p className={`text-sm ${task.is_completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {task.description}
                      </p>
                      
                      {!task.is_completed && (
                        <div className="mt-2">
                          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pixel-accent transition-all"
                              style={{ width: `${getProgressPercentage(task)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>{task.current_count}/{task.target_count}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-green-400">+{task.reward_power} 武力</span>
                        <span className="text-pink-400">+{task.reward_mood} 心情</span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
