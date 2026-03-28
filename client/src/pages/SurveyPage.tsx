import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { surveyApi } from '../lib/api';

const GUIDE_TEXT = '完善求职画像，帮助你获得个性化推荐';

interface Question {
  id: string;
  title: string;
  type: 'single' | 'multiple' | 'text';
  options?: string[];
  placeholder?: string;
}

const surveySchema = z.object({
  career: z.string().min(1, '请选择职业方向'),
  experience: z.string().min(1, '请选择工作经验'),
  target_position: z.string().optional(),
  goals: z.array(z.string()).min(1, '请至少选择一个目标'),
  style: z.string().min(1, '请选择面试风格'),
  industry: z.string().optional(),
  company_type: z.string().optional(),
  salary_range: z.string().optional(),
  job_search_status: z.string().optional(),
  interview_experience: z.string().optional(),
  weakness: z.array(z.string()).optional(),
  preparation_time: z.string().optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

export function SurveyPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      career: '',
      experience: '',
      target_position: '',
      goals: [],
      style: '',
      industry: '',
      company_type: '',
      salary_range: '',
      job_search_status: '',
      interview_experience: '',
      weakness: [],
      preparation_time: '',
    },
  });

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await surveyApi.getQuestions();
        setQuestions(data as Question[]);
      } catch (err) {
        setError('加载问题失败，请刷新页面重试');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const currentQuestion = questions[currentStep];
  const watchedValue = currentQuestion ? watch(currentQuestion.id as keyof SurveyFormData) : undefined;

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOptionSelect = (option: string) => {
    const field = currentQuestion.id as keyof SurveyFormData;
    
    if (currentQuestion.type === 'multiple') {
      const currentValues = (watchedValue as string[]) || [];
      const newValues = currentValues.includes(option)
        ? currentValues.filter(v => v !== option)
        : [...currentValues, option];
      setValue(field, newValues as SurveyFormData[keyof SurveyFormData]);
    } else {
      setValue(field, option as SurveyFormData[keyof SurveyFormData]);
    }
  };

  const onSubmit = async (data: SurveyFormData) => {
    try {
      const answers = Object.entries(data)
        .filter(([_, value]) => {
          if (Array.isArray(value)) return value.length > 0;
          return value !== undefined && value !== null && value !== '';
        })
        .map(([question_id, answer]) => {
          const question = questions.find(q => q.id === question_id);
          const processedAnswer = question?.type === 'multiple' 
            ? answer 
            : (Array.isArray(answer) ? answer[0] : answer);
          return {
            question_id,
            answer: processedAnswer,
          };
        });
      console.log('Submitting survey:', { answers });
      await surveyApi.submit({ answers });
      navigate('/', { state: { profileUpdated: true } });
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const progress = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="pixel-card text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-pixel-accent" />
          <p className="mt-4 text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="pixel-card text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
          <p className="mt-4 text-gray-400">{error || '暂无问题'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 pixel-button"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="h-2 bg-pixel-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-pixel-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-sm text-gray-400 mt-2">
            {currentStep + 1} / {questions.length}
          </p>
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="pixel-card"
        >
          <h1 className="font-pixel text-xl mb-2 text-center text-pixel-accent">
            设置你的求职画像
          </h1>
          <p className="text-gray-400 text-sm text-center mb-6">{GUIDE_TEXT}</p>
          <h2 className="font-pixel text-lg mb-6 text-center">
            {currentQuestion.title}
          </h2>

          {currentQuestion.type === 'text' && (
            <input
              type="text"
              {...register(currentQuestion.id as keyof SurveyFormData)}
              placeholder={currentQuestion.placeholder}
              className="w-full p-4 bg-pixel-secondary rounded-lg text-white border-2 border-transparent focus:border-pixel-accent outline-none"
            />
          )}

          {currentQuestion.type !== 'text' && (
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options?.map((option) => {
                const isSelected = currentQuestion.type === 'multiple'
                  ? (watchedValue as string[])?.includes(option)
                  : watchedValue === option;

                return (
                  <motion.button
                    key={option}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOptionSelect(option)}
                    className={`p-4 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-pixel-accent text-white'
                        : 'bg-pixel-secondary text-gray-300 hover:bg-pixel-secondary/80'
                    }`}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          )}

          {errors[currentQuestion.id as keyof SurveyFormData] && (
            <p className="text-red-400 text-sm mt-2">
              {errors[currentQuestion.id as keyof SurveyFormData]?.message}
            </p>
          )}

          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 disabled:opacity-50"
            >
              <ChevronLeft size={20} />
              上一步
            </button>

            {currentStep < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="pixel-button flex items-center gap-2"
              >
                下一步
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit(onSubmit)}
                className="pixel-button flex items-center gap-2"
              >
                完成设置
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
