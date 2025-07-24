import React from 'react'
import { useParams } from 'react-router'
import { useState, useEffect } from 'react';
import useAuthUser from '@/hooks/useAuthUser.js'
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api.js'; 
import CallContent from '../components/CallContent.jsx';

import{
  StreamVideo,
  StreamVideoClient,
  StreamCall,
} from '@stream-io/video-react-sdk';

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from 'react-hot-toast';
import PageLoader from '../components/PageLoader.jsx';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const Callpage = () => {
  const {id:callId} = useParams();
  const[client, setClient] =useState(null);
  const[call, setCall] =useState(null);
  const[isConnecting, setIsConnecting] =useState(true);
  const{authUser,isLoading} =useAuthUser();
  const{data: tokenData} = useQuery({
    queryKey: ["streamToken"],
    queryFn: () => getStreamToken(),
    enabled: !!authUser, // Only run this query if authUser is available
  });

  useEffect(() => {
    const initCall = async () =>{
      if(!tokenData.token || !authUser || !callId) return;
      try {
        console.log("Initializing call with token:", tokenData.token);
        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        }
        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });
        const callInstance =  videoClient.call("default",callId);
        await callInstance.join({create: true});
        console.log("Call joined successfully:", callInstance);
        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.log("Error joining call:", error);
        toast.error("Failed to join call. Please try again.");
      }
      finally {
        setIsConnecting(false);
    }
  }

    initCall();
  }, [tokenData, authUser, callId]);
  if(isLoading || isConnecting || !client || !call) {
    return <PageLoader />
  }
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className='relative'>
        {client && call ? (
            <StreamVideo client={client}>
              <StreamCall call={call}>
                <CallContent />
              </StreamCall>
            </StreamVideo>
        ) : (
          <div className='h-full flex flex-col items-center justify-center'>
            <p>Could not initialize call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Callpage
