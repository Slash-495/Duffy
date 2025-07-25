import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    console.log("Error in getAuthUser:", error);
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export const getRecommendedUsers = async () => {
  const res = await axiosInstance.get("/users");
  const users = res.data?.recommendedUsers;

  if (!Array.isArray(users)) {
    console.error("Expected 'recommendedUsers' to be an array, but got:", users);
    return []; 
  }

  return users;
};

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

// export async function sendFriendRequest(userId) {
//   console.log("Sending friend request to:", userId)
//   const response = await axiosInstance.post(`/users/friend-request/${userId}`);
//   return response.data;
// }
export async function sendFriendRequest(userId) {
  console.log("Sending friend request to:", userId);

  const token = localStorage.getItem("token"); 

  const response = await axiosInstance.post(
    `/users/friend-request/${userId}`,
    {}, // no request body
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const token = localStorage.getItem("token");
  console.log("Accepting friend request with ID:", requestId);
  const response = await axiosInstance.put(
    `/users/friend-request/${requestId}/accept`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}