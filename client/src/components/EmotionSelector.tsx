import { motion } from 'framer-motion';

type Emotion = 'happy' | 'sad' | 'excited';

interface EmotionSelectorProps {
  selectedEmotion: Emotion;
  onEmotionChange: (emotion: Emotion) => void;
  className?: string;
}

const emotions: { id: Emotion; label: string; emoji: string }[] = [
  { id: 'happy', label: '开心', emoji: '😊' },
  { id: 'sad', label: '难过', emoji: '😢' },
  { id: 'excited', label: '激动', emoji: '🎉' },
];

export function EmotionSelector({ selectedEmotion, onEmotionChange, className = '' }: EmotionSelectorProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {emotions.map((emotion) => (
        <motion.button
          key={emotion.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onEmotionChange(emotion.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
            selectedEmotion === emotion.id
              ? 'border-pixel-accent bg-pixel-accent/20 text-pixel-accent'
              : 'border-pixel-secondary text-gray-400 hover:border-pixel-accent/50 hover:text-white'
          }`}
        >
          <span className="text-lg">{emotion.emoji}</span>
          <span className="text-sm font-medium">{emotion.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

export type { Emotion };
