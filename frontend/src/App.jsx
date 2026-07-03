import { Navigate, Route, Routes } from 'react-router'
import Homepage from './pages/Homepage.jsx'
import Signuppage from './pages/Signuppage'
import Loginpage from './pages/Loginpage'
import Notificationspage from './pages/Notificationspage'
import Onboardingpage from './pages/Onboardingpage'
import Chatpage from './pages/Chatpage'
import Callpage from './pages/Callpage'
import FlashcardsPage from './pages/FlashcardsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import LearningDashboard from './pages/LearningDashboard'
import RoleplayHub from './pages/RoleplayHub'
import RoleplaySession from './pages/RoleplaySession'
import TeacherDashboard from './pages/TeacherDashboard'
import ClassroomView from './pages/ClassroomView'
import SettingsPage from './pages/SettingsPage'
import PremiumPage from './pages/PremiumPage'
import FriendsPage from './pages/FriendsPage'
import AICoach from './pages/AICoach'
import { Toaster } from 'react-hot-toast'
import PageLoader from './components/PageLoader'
import useAuthUser from './hooks/useAuthUser'
import Layout from './components/Layout'
import { useThemeStore } from './store/useThemeStore'


const App = () => {
  //tanstack Query setup
     const{isLoading,authUser}= useAuthUser()
     const {theme} = useThemeStore();
     const isAuthenticated = Boolean(authUser)
     const isOnboarded = authUser?.isOnboarded

     if (isLoading) {
      return (
        <PageLoader />
      )}

  return (
    <div className='h-screen' data-theme={theme}>
      <Routes>
        <Route path='/' element={isAuthenticated && isOnboarded ? (<Layout showSidebar={true}><Homepage /></Layout>): (<Navigate to= {!isAuthenticated?"/login": '/onboarding'} />)} />
        <Route path='/signup' element={!isAuthenticated ?<Signuppage /> : <Navigate to = {isOnboarded?"/":"/onboarding"} />} />
        <Route path='/login' element={!isAuthenticated ?<Loginpage /> : <Navigate to = {isOnboarded?"/":"/onboarding"} />} />
        <Route path='/notifications' element={isAuthenticated && isOnboarded ?(
          <Layout showSidebar={true}>
            <Notificationspage />
          </Layout>
        ):(<Navigate to ={!isAuthenticated ? "/login": "/onboarding"}/>)} />
        <Route path='/onboarding' element={isAuthenticated ?(!isOnboarded?(<Onboardingpage />):(<Navigate to = '/' />)):(<Navigate to ='/login'/>)} />
        <Route
          path="/chat/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={false}>
                <Chatpage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route path='/call/:id' element={
          isAuthenticated && isOnboarded ? (
            <Callpage />
          ) : (
            <Navigate to ={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        } />
        <Route path='/flashcards' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <FlashcardsPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/leaderboard' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <LeaderboardPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/learning' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <LearningDashboard />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/roleplay' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <RoleplayHub />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/roleplay/:id' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={false}>
            <RoleplaySession />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/ai-coach' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <AICoach />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/teacher' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <TeacherDashboard />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/teacher/:id' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <ClassroomView />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/settings' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <SettingsPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/premium' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <PremiumPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
        <Route path='/friends' element={isAuthenticated && isOnboarded ? (
          <Layout showSidebar={true}>
            <FriendsPage />
          </Layout>
        ) : (<Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />)} />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
