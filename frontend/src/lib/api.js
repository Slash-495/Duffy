import axiosInstance from '../lib/axios.js';

export const signup = async (data)=>{
      const response = await axiosInstance.post('/auth/signup', data);
      return response.data;
}
export default signup;