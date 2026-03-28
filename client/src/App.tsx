import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SurveyPage } from './pages/SurveyPage';
import { InterviewPage } from './pages/InterviewPage';
import { InterviewResultPage } from './pages/InterviewResultPage';
import { AchievementPage } from './pages/AchievementPage';
import { InterviewHistoryPage } from './pages/InterviewHistoryPage';
import { AvatarPage } from './pages/AvatarPage';
import { ProfilePage } from './pages/ProfilePage';
import { AiChatPage } from './pages/AiChatPage';
import { VoiceInterviewPage } from './pages/VoiceInterviewPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { TreeHolePage } from './pages/TreeHolePage';
import { ResumeDesignerPage } from './pages/ResumeDesignerPage';
import { FriendsPage } from './pages/FriendsPage';
import { CheckInPage } from './pages/CheckInPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/survey',
    element: <SurveyPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/interview',
    element: <InterviewPage />,
  },
  {
    path: '/result',
    element: <InterviewResultPage />,
  },
  {
    path: '/achievements',
    element: <AchievementPage />,
  },
  {
    path: '/interviews/history',
    element: <InterviewHistoryPage />,
  },
  {
    path: '/avatar',
    element: <AvatarPage />,
  },
  {
    path: '/ai-chat',
    element: <AiChatPage />,
  },
  {
    path: '/voice-interview',
    element: <VoiceInterviewPage />,
  },
  {
    path: '/report/:reportId',
    element: <ReportDetailPage />,
  },
  {
    path: '/tree-hole',
    element: <TreeHolePage />,
  },
  {
    path: '/resume',
    element: <ResumeDesignerPage />,
  },
  {
    path: '/friends',
    element: <FriendsPage />,
  },
  {
    path: '/checkin',
    element: <CheckInPage />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
