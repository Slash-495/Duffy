import axiosInstance from '../lib/axios.js';

export const signup = async (data)=>{
      const response = await axiosInstance.post('/auth/signup', data);
      return response.data;
}
export const login = async (loginData)=>{
      const response = await axiosInstance.post('/auth/login', loginData);
      return response.data;
}

export const getAuthUser = async () => {
      const res = await axiosInstance.get('/auth/me')
     return res.data 
    }

export const completeOnboarding = async (userData) => {
      const response = await axiosInstance.post('/auth/onboarding', userData);
      return response.data;
}


export default signup;