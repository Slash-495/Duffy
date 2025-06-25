import React from 'react'
import { useThemeStore } from '../store/useThemeStore'
const Homepage = () => {
  const {theme,setheme} = useThemeStore()
  return (
    <div>
      HomePage
    </div>
  )
}

export default Homepage
