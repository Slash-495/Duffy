import axiosInstance from '../lib/axios.js';

export const signup = async (data)=>{
      const response = await axiosInstance.post('/auth/signup', data);
      return response.data;
}
export const login = async (loginData)=>{
      try {
            const response = await axiosInstance.post('/auth/login', loginData);
            return response.data;
      } catch (error) {
            console.error("Login failed:", error);
            return null; 
      }
}
export const logout = async ()=>{
      try {
            const response = await axiosInstance.post('/auth/logout');
            return response.data;
      } catch (error) {
            console.error("Logout failed:", error);
            return null; 
      }
}

export const getAuthUser = async () => {
      try {
            const res = await axiosInstance.get('/auth/me')
           return res.data 
      } catch (error) {
            console.error("Failed to fetch authenticated user:", error);
            return null; 
      }
    }

export const completeOnboarding = async (userData) => {
      try {
            const response = await axiosInstance.post('/auth/onboarding', userData);
            return response.data;
      } catch (error) {
            console.error("Onboarding completion failed:", error);
            return null;
      }
}


export default signup;