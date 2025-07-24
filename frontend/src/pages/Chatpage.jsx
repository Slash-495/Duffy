import React from 'react'
import { useParams } from 'react-router';
import { useState,useEffect } from 'react';
import useAuthUser from '@/hooks/useAuthUser.js'
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api.js';
import { StreamChat } from 'stream-chat';
import ChatLoader from '../components/ChatLoader.jsx';
import CallButton from '../components/CallButton.jsx';
import {
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Window,
  Thread,
  Chat,
} from 'stream-chat-react';
// import { set } from 'mongoose';
import toast from 'react-hot-toast';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const Chatpage = () => {
  const {id:targetUserId} = useParams();
  // console.log("Chatpage ID:", targetUserId);
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const[loading, setLoading] = useState(true);

  const {authUser} = useAuthUser();
  const {data:tokenData} = useQuery({
    queryKey: ["streamToken"],
    queryFn: () => getStreamToken(),
    enabled: !!authUser, // Only run this query if authUser is available
    })

    useEffect(()=>{
      const initChat = async () => {
        if(!tokenData?.token || !authUser) return;
        try {
          console.log("Initializing chat client with token:", tokenData.token);
          const client = StreamChat.getInstance(STREAM_API_KEY);

          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          )
          const channelId = [authUser._id, targetUserId].sort().join("--"); // just to make sure a proper format of channel ID : [myId,yourId]
          
          const currChanel = client.channel("messaging", channelId, {
            members : [authUser._id, targetUserId],
          });
          await currChanel.watch();
          setChatClient(client);
          setChannel(currChanel);
        } catch (error) {
          console.log("Error initializing chat client:", error);
          toast.error("Failed to initialize chat. Please try again later.");
        }
        finally {
          setLoading(false);
        }
      }
        initChat();
},[tokenData,authUser,targetUserId]);

const handleVideoCall = () => {}

  if(loading || !chatClient || !channel) {
    return <ChatLoader /> }
  return (
    <div className="h-[93vh]">
        <Chat client={chatClient}>
          <Channel channel={channel}>
            <div className='w-full relative'>
              <CallButton handleVideoCall={handleVideoCall}/>
              <Window>
                <ChannelHeader />
                <MessageList />
                <MessageInput focus/>
              </Window>
            </div>
            <Thread />
            </Channel>
      </Chat>
    </div>
  )
}
export default Chatpage;