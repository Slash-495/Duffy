import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFriendRequests } from '../lib/api';
const Notificationspage = () => {
  const queryClient = useQueryClient();
  const{data:friendRequests, isLoading} = useQuery({
    queryKey: ['friendRequests'],
    queryFn: getFriendRequests})
  return (
    <div>
      
    </div>
  )
}

export default Notificationspage
