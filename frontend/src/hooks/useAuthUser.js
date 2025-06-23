import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAuthUser } from '../lib/api.js'

const useAuthUser = () => {
    const authUser = useQuery(
        {queryKey: ["authUser"],
        queryFn: getAuthUser,
        retry: false, //auth check should not retry on failure
     });

     return {isLoading: authUser.isLoading, authUser: authUser.data?.user, error: authUser.error}
}

export default useAuthUser
