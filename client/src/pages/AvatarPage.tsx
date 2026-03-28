import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, Check, AlertCircle, Star } from 'lucide-react';
import type { AvatarTaskStatus, EmotionUrls } from '../lib/api';
import { avatarApi } from '../lib/api';

const DEFAULT_USER_ID = 'default_user';

type Style = 'professional' | 'casual' | 'creative';
type Emotion = 'happy' | 'sad' | 'excited';

const styles: { id: Style; label: string; description: string }[] = [
  { id: 'professional', label: '专业', description: '商务正装风格' },
  { id: 'casual', label: '休闲', description: '轻松日常风格' },
  { id: 'creative', label: '创意', description: '艺术创意风格' },
];

const emotions: { id: Emotion; label: string; emoji: string }[] = [
  { id: 'happy', label: '开心', emoji: '😊' },
  { id: 'sad', label: '难过', emoji: '😢' },
  { id: 'excited', label: '激动', emoji: '🎉' },
];

interface GenerationResult {
  emotions: Record<Emotion, EmotionUrls>;
}

export function AvatarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>('professional');
  const [isUploading, setIsUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<AvatarTaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>('happy');
  const [defaultEmotion, setDefaultEmotion] = useState<Emotion>('happy');
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  useEffect(() => {
    if (!taskId || status?.status === 'completed' || status?.status === 'failed') return;

    let failedCount = 0;
    
    const pollStatus = async () => {
      try {
        const result = await avatarApi.getStatus(taskId);
        setStatus(result);
        failedCount = 0;
      } catch {
        failedCount++;
        if (failedCount > 3) {
          setError('获取状态失败，请重试');
        }
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [taskId, status?.status]);

  useEffect(() => {
    if (status?.status === 'completed' && status.result?.emotions) {
      setGenerationResult({
        emotions: status.result.emotions as Record<Emotion, EmotionUrls>,
      });
    }
  }, [status]);

  const handleGenerate = async () => {
    if (!file) {
      setError('请先上传照片');
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatus(null);
    setGenerationResult(null);

    try {
      const response = await avatarApi.upload(file, style, DEFAULT_USER_ID);
      setTaskId(response.task_id);
    } catch {
      setError('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setTaskId(null);
    setStatus(null);
    setError(null);
    setGenerationResult(null);
    setSelectedEmotion('happy');
  };

  const handleSetDefaultEmotion = async () => {
    setDefaultEmotion(selectedEmotion);
  };

  const currentEmotionData = generationResult?.emotions[selectedEmotion];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <h1 className="font-pixel text-2xl text-center text-pixel-accent mb-8">
          像素头像生成器
        </h1>

        <div className="pixel-card space-y-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative border-2 border-dashed border-pixel-secondary rounded-lg p-8 text-center cursor-pointer hover:border-pixel-accent transition-colors"
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 mx-auto object-cover rounded-lg"
              />
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 mx-auto text-gray-500" />
                <p className="text-gray-400">拖拽或点击上传照片</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">风格</label>
            <div className="flex gap-3">
              {styles.map((s) => (
                <motion.button
                  key={s.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStyle(s.id)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    style === s.id
                      ? 'border-pixel-accent bg-pixel-accent/20'
                      : 'border-pixel-secondary hover:border-pixel-accent/50'
                  }`}
                >
                  <div className="font-pixel text-sm">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.description}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={!file || isUploading || (status !== null && status.status !== 'completed' && status.status !== 'failed')}
            className="w-full pixel-button py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                上传中...
              </span>
            ) : status && status.status !== 'completed' && status.status !== 'failed' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                生成中... {status.progress}%
              </span>
            ) : (
              '生成像素头像'
            )}
          </motion.button>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {status && status.status !== 'completed' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">进度</span>
                <span className="text-pixel-accent">{status.progress}%</span>
              </div>
              <div className="h-3 bg-pixel-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-pixel-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${status.progress}%` }}
                />
              </div>
            </div>
          )}

          {generationResult && currentEmotionData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                生成完成
              </div>

              <div className="border-2 border-pixel-secondary rounded-lg overflow-hidden">
                <div className="flex border-b border-pixel-secondary">
                  {emotions.map((emotion) => (
                    <button
                      key={emotion.id}
                      onClick={() => setSelectedEmotion(emotion.id)}
                      className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                        selectedEmotion === emotion.id
                          ? 'bg-pixel-accent/20 text-pixel-accent border-b-2 border-pixel-accent'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="mr-2">{emotion.emoji}</span>
                      {emotion.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-pixel-secondary/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400 text-center">静态图</p>
                      <img
                        src={`http://localhost:8000${currentEmotionData.png}`}
                        alt={`${selectedEmotion} avatar`}
                        className="w-full aspect-square object-contain bg-pixel-secondary rounded-lg"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400 text-center">动画</p>
                      <img
                        src={`http://localhost:8000${currentEmotionData.gif}`}
                        alt={`${selectedEmotion} animated avatar`}
                        className="w-full aspect-square object-contain bg-pixel-secondary rounded-lg"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {defaultEmotion === selectedEmotion && (
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          默认情绪
                        </span>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSetDefaultEmotion}
                      disabled={defaultEmotion === selectedEmotion}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        defaultEmotion === selectedEmotion
                          ? 'bg-pixel-accent/30 text-pixel-accent cursor-not-allowed'
                          : 'bg-pixel-accent text-white hover:bg-pixel-accent/80'
                      }`}
                    >
                      {defaultEmotion === selectedEmotion ? '已设为默认' : '设为默认情绪'}
                    </motion.button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2 border-2 border-pixel-secondary rounded-lg hover:border-pixel-accent transition-colors"
              >
                重新生成
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
