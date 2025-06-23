import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signup } from '../lib/api.js'

const useSignUp = () => {
    const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      console.log("Signup successful:", data);
      // Add redirect or notification here if needed
    },
    onError: (err) => {
      console.error("Signup failed:", err);
    },
  });
  return (
    { error, isPending, signUpMutation: mutate }
  )
}

export default useSignUp
