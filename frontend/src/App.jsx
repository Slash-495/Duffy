import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import Homepage from './pages/Homepage.jsx';
import Signuppage from './pages/Signuppage';
import Loginpage from './pages/Loginpage';
import Onboardingpage from './pages/Onboardingpage';

const Notificationspage = lazy(() => import('./pages/Notificationspage'));
const Chatpage = lazy(() => import('./pages/Chatpage'));
const Callpage = lazy(() => import('./pages/Callpage'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'));
const DeckDetailsPage = lazy(() => import('./pages/DeckDetailsPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const LearningDashboard = lazy(() => import('./pages/LearningDashboard'));
const RoleplayHub = lazy(() => import('./pages/RoleplayHub'));
const RoleplaySession = lazy(() => import('./pages/RoleplaySession'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const ClassroomView = lazy(() => import('./pages/ClassroomView'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PremiumPage = lazy(() => import('./pages/PremiumPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const AICoach = lazy(() => import('./pages/AICoach'));
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
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
      <Toaster />
    </div>
  );
};

export default App;
