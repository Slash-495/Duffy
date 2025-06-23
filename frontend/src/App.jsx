import { Navigate, Route, Routes } from 'react-router'
import Homepage from './pages/Homepage'
import Signuppage from './pages/Signuppage'
import Loginpage from './pages/Loginpage'
import Notificationspage from './pages/Notificationspage'
import Onboardingpage from './pages/Onboardingpage'
import Chatpage from './pages/Chatpage'
import Callpage from './pages/Callpage'
import { Toaster } from 'react-hot-toast'
import PageLoader from './components/PageLoader'
import useAuthUser from './hooks/useAuthUser'

const App = () => {
  //tanstack Query setup
     const{isLoading,authUser}= useAuthUser()

     const isAuthenticated = Boolean(authUser)
     const isOnboarded = authUser?.isOnboarded

     if (isLoading) {
      return (
        <PageLoader />
      )}

  return (
    <div className='h-screen' data-theme='night'>
      <Routes>
        <Route path='/' element={isAuthenticated && isOnboarded ? (<Homepage />): (<Navigate to= {!isAuthenticated?"/login": '/onboarding'} />)} />
        <Route path='/signup' element={!isAuthenticated ?<Signuppage /> : <Navigate to = {isOnboarded?"/":"/onboarding"} />} />
        <Route path='/login' element={!isAuthenticated ?<Loginpage /> : <Navigate to = {isOnboarded?"/":"/onboarding"} />} />
        <Route path='/notifications' element={isAuthenticated ?<Notificationspage />: <Navigate to ='/login'/>} />
        <Route path='/onboarding' element={isAuthenticated ?(!isOnboarded?(<Onboardingpage />):(<Navigate to = '/' />)):(<Navigate to ='/login'/>)} />
        <Route path='/chat' element={isAuthenticated ?<Chatpage /> : <Navigate to="/login" />} />
        <Route path='/call' element={isAuthenticated ?<Callpage /> : <Navigate to="/login" />} />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
