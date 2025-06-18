import React from 'react'
import { Route, Routes } from 'react-router'
import Homepage from './pages/homepage'
import Signuppage from './pages/Signuppage'
import Loginpage from './pages/Loginpage'
import Notificationspage from './pages/Notificationspage'
import Onboardingpage from './pages/Onboardingpage'
import Chatpage from './pages/Chatpage'
import Callpage from './pages/Callpage'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

const App = () => {
  return (
    <div className='h-screen' data-theme='night'>
      <Routes>
        <Route path='/' element={<Homepage />} />
        <Route path='/signup' element={<Signuppage />} />
        <Route path='/login' element={<Loginpage />} />
        <Route path='/notifications' element={<Notificationspage />} />
        <Route path='/onboarding' element={<Onboardingpage />} />
        <Route path='/chat' element={<Chatpage />} />
        <Route path='/call' element={<Callpage />} />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
