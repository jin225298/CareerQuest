import { motion } from 'framer-motion';

interface StressBarProps {
  level: number;
  maxLevel?: number;
  className?: string;
  showLabel?: boolean;
}

export function StressBar({ 
  level, 
  maxLevel = 100, 
  className = '',
  showLabel = true 
}: StressBarProps) {
  const percentage = Math.min((level / maxLevel) * 100, 100);
  
  const getColor = () => {
    if (percentage > 70) return 'bg-red-500';
    if (percentage > 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getEmoji = () => {
    if (percentage > 70) return '😰';
    if (percentage > 40) return '😅';
    return '😊';
  };

  const getStatusText = () => {
    if (percentage > 70) return '高压';
    if (percentage > 40) return '中等';
    return '放松';
  };

  return (
    <div className={`${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span>{getEmoji()}</span>
            压力值
          </span>
          <span className="text-xs text-gray-400">{getStatusText()}</span>
        </div>
      )}
      
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        
        {percentage > 70 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">0</span>
        <span className="text-xs font-medium" style={{ color: getColor().includes('red') ? '#ef4444' : getColor().includes('yellow') ? '#eab308' : '#22c55e' }}>
          {Math.round(level)}
        </span>
        <span className="text-xs text-gray-400">{maxLevel}</span>
      </div>
    </div>
  );
}
