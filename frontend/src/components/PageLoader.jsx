import { LoaderIcon } from 'lucide-react'
import React from 'react'

const PageLoader = () => {
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <LoaderIcon className='size-12 text-primary animate-spin' />
    </div>
  )
}

export default PageLoader
