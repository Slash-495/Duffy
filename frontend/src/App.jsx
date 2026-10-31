import { Navigate, Route, Routes } from 'react-router';
import Homepage from './pages/Homepage.jsx';
import Signuppage from './pages/Signuppage';
import Loginpage from './pages/Loginpage';
import Notificationspage from './pages/Notificationspage';
import Onboardingpage from './pages/Onboardingpage';
import Chatpage from './pages/Chatpage';
import Callpage from './pages/Callpage';
import FlashcardsPage from './pages/FlashcardsPage';
import DeckDetailsPage from './pages/DeckDetailsPage';
import ReviewPage from './pages/ReviewPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LearningDashboard from './pages/LearningDashboard';
import RoleplayHub from './pages/RoleplayHub';
import RoleplaySession from './pages/RoleplaySession';
import TeacherDashboard from './pages/TeacherDashboard';
import ClassroomView from './pages/ClassroomView';
import SettingsPage from './pages/SettingsPage';
import PremiumPage from './pages/PremiumPage';
import FriendsPage from './pages/FriendsPage';
import AICoach from './pages/AICoach';
import { Toaster } from 'react-hot-toast';
import PageLoader from './components/PageLoader';
import useAuthUser from './hooks/useAuthUser';
import usePresenceHeartbeat from './hooks/usePresenceHeartbeat';
import Layout from './components/Layout';
import { useThemeStore } from './store/useThemeStore';

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();
  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;
  const isTeacherOrAdmin =
    authUser?.role === 'TEACHER' || authUser?.role === 'ADMIN';

  usePresenceHeartbeat(isAuthenticated);

  if (isLoading) {
    return <PageLoader />;
  }

  const requireAuth = (element) =>
    isAuthenticated && isOnboarded ? (
      element
    ) : (
      <Navigate to={!isAuthenticated ? '/login' : '/onboarding'} replace />
    );

  const requireTeacher = (element) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isOnboarded) return <Navigate to="/onboarding" replace />;
    if (!isTeacherOrAdmin) return <Navigate to="/" replace />;
    return element;
  };

  return (
    <div className="h-screen" data-theme={theme}>
      <Routes>
        <Route
          path="/"
          element={requireAuth(
            <Layout showSidebar={true}>
              <Homepage />
            </Layout>
          )}
        />
        <Route
          path="/signup"
          element={
            !isAuthenticated ? (
              <Signuppage />
            ) : (
              <Navigate to={isOnboarded ? '/' : '/onboarding'} replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Loginpage />
            ) : (
              <Navigate to={isOnboarded ? '/' : '/onboarding'} replace />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              !isOnboarded ? (
                <Onboardingpage />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/notifications"
          element={requireAuth(
            <Layout showSidebar={true}>
              <Notificationspage />
            </Layout>
          )}
        />
        <Route
          path="/chat/:id"
          element={requireAuth(
            <Layout showSidebar={false}>
              <Chatpage />
            </Layout>
          )}
        />
        <Route path="/call/:id" element={requireAuth(<Callpage />)} />
        <Route
          path="/flashcards"
          element={requireAuth(
            <Layout showSidebar={true}>
              <FlashcardsPage />
            </Layout>
          )}
        />
        <Route
          path="/flashcards/deck/:id"
          element={requireAuth(
            <Layout showSidebar={true}>
              <DeckDetailsPage />
            </Layout>
          )}
        />
        <Route path="/review" element={requireAuth(<ReviewPage />)} />
        <Route path="/review/:id" element={requireAuth(<ReviewPage />)} />
        <Route
          path="/leaderboard"
          element={requireAuth(
            <Layout showSidebar={true}>
              <LeaderboardPage />
            </Layout>
          )}
        />
        <Route
          path="/learning"
          element={requireAuth(
            <Layout showSidebar={true}>
              <LearningDashboard />
            </Layout>
          )}
        />
        <Route
          path="/roleplay"
          element={requireAuth(
            <Layout showSidebar={true}>
              <RoleplayHub />
            </Layout>
          )}
        />
        <Route
          path="/roleplay/:id"
          element={requireAuth(
            <Layout showSidebar={false}>
              <RoleplaySession />
            </Layout>
          )}
        />
        <Route
          path="/ai-coach"
          element={requireAuth(
            <Layout showSidebar={true}>
              <AICoach />
            </Layout>
          )}
        />
        <Route
          path="/teacher"
          element={requireTeacher(
            <Layout showSidebar={true}>
              <TeacherDashboard />
            </Layout>
          )}
        />
        <Route
          path="/teacher/:id"
          element={requireTeacher(
            <Layout showSidebar={true}>
              <ClassroomView />
            </Layout>
          )}
        />
        <Route
          path="/settings"
          element={requireAuth(
            <Layout showSidebar={true}>
              <SettingsPage />
            </Layout>
          )}
        />
        <Route
          path="/premium"
          element={requireAuth(
            <Layout showSidebar={true}>
              <PremiumPage />
            </Layout>
          )}
        />
        <Route
          path="/friends"
          element={requireAuth(
            <Layout showSidebar={true}>
              <FriendsPage />
            </Layout>
          )}
        />
      </Routes>
      <Toaster />
    </div>
  );
};

export default App;
