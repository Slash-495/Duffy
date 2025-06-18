import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import Homepage from './pages/homepage'
import Signuppage from './pages/Signuppage'
import Loginpage from './pages/Loginpage'
import Notificationspage from './pages/Notificationspage'
import Onboardingpage from './pages/Onboardingpage'
import Chatpage from './pages/Chatpage'
import Callpage from './pages/Callpage'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { axiosInstance } from './lib/axios'

const App = () => {
  //tanstack Query setup
  const {data:authData,isLoading, error} = useQuery({queryKey: ["authUser"],
     queryFn: async () => {
      const res = await axiosInstance.get('/auth/me')
      return res.data 
    },
    retry: false, //auth check should not retry on failure
     })
     const authUser = authData?.user
  return (
    <div className='h-screen' data-theme='night'>
      <Routes>
        <Route path='/' element={authUser ?<Homepage /> : <Navigate to="/login"/>} />
        <Route path='/signup' element={!authUser ?<Signuppage /> : <Navigate to = '/'/>} />
        <Route path='/login' element={!authUser ?<Loginpage /> : <Navigate to ='/' />} />
        <Route path='/notifications' element={authUser ?<Notificationspage />: <Navigate to ='/login'/>} />
        <Route path='/onboarding' element={authUser ?<Onboardingpage /> : <Navigate to="/login" />} />
        <Route path='/chat' element={authUser ?<Chatpage /> : <Navigate to="/login" />} />
        <Route path='/call' element={authUser ?<Callpage /> : <Navigate to="/login" />} />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
