const API_BASE = 'http://localhost:8000/api/v1';

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new ApiError(response.status, error);
    }
    
    const result = await response.json();
    return result;
  },

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  },

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  },
};

export const interviewApi = {
  start: (data: { type: string; difficulty: string; position?: string }) =>
    api.post('/interviews/start', data),
  
  reply: (data: { session_id: string; message: string }) =>
    api.post('/interviews/reply', data),
  
  end: (data: { session_id: string; max_stress?: number }) =>
    api.post('/interviews/end', data),
};

export const surveyApi = {
  getQuestions: () => 
    api.get('/survey/questions'),
  
  submit: (data: { answers: Array<{ question_id: string; answer: string | string[] }> }) =>
    api.post('/survey/submit', data),
};

export interface UserProfile {
  career: string | null;
  experience: string | null;
  target_position: string | null;
  industry: string | null;
  company_type: string | null;
  salary_range: string | null;
  job_search_status: string | null;
  preparation_time: string | null;
  goals: string[];
  weakness: string[];
  style_preference: string | null;
}

export interface UserTag {
  tag_key: string;
  tag_value: string;
  tag_type: string;
}

export interface UserProfileResponse {
  user_id: string;
  nickname: string | null;
  profile: UserProfile;
  is_profile_completed: boolean;
  profile_completed_at: string | null;
  tags: UserTag[];
}

export interface UserStatus {
  is_new_user: boolean;
  is_profile_completed: boolean;
  recommended_action: string;
}

export interface SurveySubmitResponse {
  success: boolean;
  message: string;
}

export const userApi = {
  getCurrentUser: () => 
    api.get('/users/me'),
  
  getStats: () =>
    api.get('/users/me/stats'),

  getProfile: () =>
    api.get<UserProfileResponse>('/users/me/profile'),

  updateProfile: (data: UserProfile) =>
    api.put('/users/me/profile', data),

  getStatus: () =>
    api.get<UserStatus>('/users/me/status'),
};

export interface UploadAvatarResponse {
  task_id: string;
  message: string;
}

export interface EmotionUrls {
  gif: string;
  png: string;
}

export interface MultiEmotionAvatarResponse {
  avatar_id: string;
  emotions: Record<string, EmotionUrls>;
  metadata: Record<string, unknown>;
}

export interface AvatarResponse {
  avatar_id: string;
  sprite_url: string;
  preview_url: string;
  metadata: Record<string, unknown>;
}

export interface AvatarTaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: MultiEmotionAvatarResponse;
  error?: string;
}

export interface EmotionResponse {
  preview_url: string;
  sprite_url: string;
  current_emotion: string;
  mood: number;
}

export const avatarApi = {
  upload: async (file: File, style?: string, userId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (style) formData.append('style', style);
    if (userId) formData.append('user_id', userId);
    const response = await fetch(`${API_BASE}/avatars/upload?${userId ? `user_id=${userId}` : ''}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<UploadAvatarResponse>;
  },
  
  getStatus: (taskId: string) =>
    api.get<AvatarTaskStatus>(`/avatars/${taskId}/status`),
  
  setEmotion: (userId: string, emotion: string) =>
    api.patch(`/avatars/users/${userId}/emotion`, { emotion }),
  
  getEmotion: (userId: string) =>
    api.get<EmotionResponse>(`/avatars/users/${userId}/emotion`),
};

export interface CreateSessionResponse {
  session_id: string;
  created_at: string;
}

export interface MessageResponse {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  recommendations?: TaskRecommendation[];
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: Array<{
    message_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
}

export const aiChatApi = {
  createSession: (npcType?: string) => 
    api.post<CreateSessionResponse>('/ai-chat/sessions', { npc_type: npcType || 'teacher' }),
  sendMessage: (sessionId: string, content: string) =>
    api.post<MessageResponse>(`/ai-chat/sessions/${sessionId}/messages`, { content }),
  getHistory: (sessionId: string) =>
    api.get<ChatHistoryResponse>(`/ai-chat/sessions/${sessionId}`),
};

export interface TaskRecommendation {
  id: number;
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimated_time: number;
  reward_power: number;
  reward_mood: number;
  task_type: string;
}

export interface TodayFocus {
  main_task: string;
  progress: number;
  streak_days: number;
  encouragement: string;
}

export interface DailyTask {
  id: number;
  task_type: string;
  description: string;
  target_count: number;
  current_count: number;
  reward_power: number;
  reward_mood: number;
  is_completed: boolean;
  task_date: string;
}

export interface CompleteTaskResponse {
  success: boolean;
  power_gained: number;
  mood_gained: number;
  streak_bonus: number;
  message: string;
}

export const taskApi = {
  getDailyTasks: () =>
    api.get<{ tasks: DailyTask[]; total_completed: number; total_tasks: number; power_reward: number; mood_reward: number }>('/tasks/daily'),

  updateProgress: (data: { task_id: number; increment: number }) =>
    api.post('/tasks/progress', data),

  claimRewards: () =>
    api.post('/tasks/claim-rewards'),

  getRecommendations: () => api.get<TaskRecommendation[]>('/tasks/recommendations'),

  acceptRecommendation: (id: number) =>
    api.post(`/tasks/recommendations/${id}/accept`),

  rejectRecommendation: (id: number) =>
    api.post(`/tasks/recommendations/${id}/reject`),

  getTodayFocus: () => api.get<TodayFocus>('/tasks/today-focus'),

  completeTask: (taskId: number) => api.post<CompleteTaskResponse>(`/tasks/${taskId}/complete`),
};

export const achievementApi = {
  getAchievements: () =>
    api.get('/achievements'),
  
  getPendingAchievements: () =>
    api.get('/achievements/pending'),
  
  markAsNotified: (achievementId: number) =>
    api.post(`/achievements/${achievementId}/notify`),
};

export const reportApi = {
  getReport: (reportId: string) => 
    api.get(`/interviews/reports/${reportId}`),
  getReportBySession: (sessionId: string) =>
    api.get(`/interviews/${sessionId}/report`),
};

export const voiceApi = {
  startSession: (data: { position?: string; company?: string }) =>
    api.post('/voice/start', data),
  
  endSession: (sessionId: string) =>
    api.post(`/voice/end?session_id=${sessionId}`),
  
  getStatus: (sessionId: string) =>
    api.get(`/voice/${sessionId}/status`),
};

export interface TreeHolePost {
  id: number;
  emotion: string;
  content: string;
  likes_count: number;
  created_at: string;
  is_anonymous: boolean;
  author_name: string | null;
  is_liked: boolean;
}

export interface TreeHolePostListResponse {
  posts: TreeHolePost[];
  total: number;
}

export interface CreatePostRequest {
  emotion: string;
  content: string;
  is_anonymous: boolean;
}

export interface LikeResponse {
  success: boolean;
  likes_count: number;
}

export const treeHoleApi = {
  getPosts: (skip = 0, limit = 20, emotion?: string) => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (emotion) params.append('emotion', emotion);
    return api.get<TreeHolePostListResponse>(`/tree-hole/posts?${params.toString()}`);
  },

  getPost: (postId: number) =>
    api.get<TreeHolePost>(`/tree-hole/posts/${postId}`),

  createPost: (data: CreatePostRequest) =>
    api.post<TreeHolePost>('/tree-hole/posts', data),

  likePost: (postId: number) =>
    api.post<LikeResponse>(`/tree-hole/posts/${postId}/like`),

  unlikePost: (postId: number) =>
    api.delete<LikeResponse>(`/tree-hole/posts/${postId}/like`),
};

export const resumeApi = {
  getProfile: () => api.get('/resume/profile'),
  getProjects: () => api.get('/resume/projects'),
  createProject: (data: { name: string; role: string; start_date: string; end_date?: string | null; tech_stack: string[]; description: string; link?: string | null }) =>
    api.post('/resume/projects', data),
  updateProject: (id: number, data: { name: string; role: string; start_date: string; end_date?: string | null; tech_stack: string[]; description: string; link?: string | null }) =>
    api.put(`/resume/projects/${id}`, data),
  deleteProject: (id: number) => api.delete(`/resume/projects/${id}`),
  getSkills: () => api.get('/resume/skills'),
  createSkill: (data: { name: string; category: string }) => api.post('/resume/skills', data),
  deleteSkill: (id: number) => api.delete(`/resume/skills/${id}`),
  generate: (data: { target_position: string; target_company?: string; style: string }) =>
    api.post('/resume/generate', data),
  optimize: (data: { content: string; target_position: string }) =>
    api.post('/resume/optimize', data),
};

export interface Friend {
  id: string;
  nickname: string;
  avatar_url?: string;
  power: number;
  mood: number;
  total_interviews: number;
  avg_score: number;
}

export interface FriendRequest {
  id: string;
  from_user: {
    id: string;
    nickname: string;
    avatar_url?: string;
  };
  message?: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  nickname: string;
  avatar_url?: string;
  is_friend: boolean;
  has_pending_request: boolean;
}

export interface CompareResult {
  me: {
    power: number;
    mood: number;
    total_interviews: number;
    avg_score: number;
    dimensions: {
      expression: number;
      logic: number;
      professional: number;
      adaptability: number;
      emotion: number;
    };
  };
  friend: {
    power: number;
    mood: number;
    total_interviews: number;
    avg_score: number;
    dimensions: {
      expression: number;
      logic: number;
      professional: number;
      adaptability: number;
      emotion: number;
    };
  };
}

export const friendApi = {
  sendRequest: (data: { to_user_id: string; message?: string }) =>
    api.post('/friends/request', data),
  getRequests: (type: 'received' | 'sent' = 'received') =>
    api.get<FriendRequest[]>(`/friends/requests?type=${type}`),
  acceptRequest: (id: string) =>
    api.post(`/friends/requests/${id}/accept`),
  rejectRequest: (id: string) =>
    api.post(`/friends/requests/${id}/reject`),
  getFriends: () =>
    api.get<Friend[]>('/friends'),
  deleteFriend: (friendId: string) =>
    api.delete(`/friends/${friendId}`),
  searchUsers: (keyword: string) =>
    api.get<SearchResult[]>(`/friends/search?keyword=${keyword}`),
  inviteInterview: (data: { friend_id: string; position?: string }) =>
    api.post('/friends/invite', data),
  compareWithFriend: (friendId: string) =>
    api.get<CompareResult>(`/friends/compare/${friendId}`),
};

export interface CheckInData {
  mood: string;
  note?: string;
}

export interface TodayCheckIn {
  checked_in: boolean;
  streak_days: number;
  today_rewards?: {
    power: number;
    mood: number;
  };
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_check_ins: number;
}

export interface CalendarData {
  year: number;
  month: number;
  check_ins: Array<{
    date: string;
    mood: string;
  }>;
}

export interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  avatar_url?: string;
  streak_days: number;
  total_check_ins: number;
  rank: number;
}

export const checkinApi = {
  checkIn: (data: CheckInData) =>
    api.post<{ success: boolean; streak_days: number; rewards: { power: number; mood: number } }>('/checkin', data),
  getToday: () =>
    api.get<TodayCheckIn>('/checkin/today'),
  getStreak: () =>
    api.get<StreakData>('/checkin/streak'),
  getCalendar: (year: number, month: number) =>
    api.get<CalendarData>(`/checkin/calendar?year=${year}&month=${month}`),
  getLeaderboard: () =>
    api.get<LeaderboardEntry[]>('/checkin/leaderboard'),
};
