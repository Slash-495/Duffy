import { Navigate, Route, Routes } from 'react-router'
import Homepage from './pages/Homepage.jsx'
import Signuppage from './pages/Signuppage'
import Loginpage from './pages/Loginpage'
import Notificationspage from './pages/Notificationspage'
import Onboardingpage from './pages/Onboardingpage'
import Chatpage from './pages/Chatpage'
import Callpage from './pages/Callpage'
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
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
