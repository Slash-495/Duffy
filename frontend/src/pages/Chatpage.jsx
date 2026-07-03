import React from 'react'
import { useParams } from 'react-router';
import { useState,useEffect } from 'react';
import useAuthUser from '@/hooks/useAuthUser.js'
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api.js';
import { StreamChat } from 'stream-chat';
import ChatLoader from '../components/ChatLoader.jsx';
import CallButton from '../components/CallButton.jsx';
import SaveFromChatModal from '../components/SaveFromChatModal.jsx';
import AISidebar from '../components/ai/AISidebar.jsx';
import useAIStore from '../store/useAIStore.js';
import { BookOpenIcon, SparklesIcon } from 'lucide-react';
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
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const[loading, setLoading] = useState(true);

  // Flashcards & AI State
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [selectedMessageText, setSelectedMessageText] = useState("");
  const { isSidebarOpen, setSidebarOpen, setActiveTab } = useAIStore();

  const {authUser} = useAuthUser();
  const {data:tokenData} = useQuery({
    queryKey: ["streamToken"],
    queryFn: () => getStreamToken(),
    enabled: !!authUser,
    })

    useEffect(()=>{
      const initChat = async () => {
        if(!tokenData?.token || !authUser) return;
        try {
          const client = StreamChat.getInstance(STREAM_API_KEY);

          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          )
          const channelId = [authUser._id, targetUserId].sort().join("--"); 
          
          const currChanel = client.channel("messaging", channelId, {
            members : [authUser._id, targetUserId],
          });
          await currChanel.watch();
          setChatClient(client);
          setChannel(currChanel);
        } catch (error) {
          toast.error("Failed to initialize chat. Please try again later.");
        }
        finally {
          setLoading(false);
        }
      }
        initChat();
},[tokenData,authUser,targetUserId]);

const handleVideoCall = () => {
  if(channel){
    const callUrl = `${window.location.origin}/call/${channel.id}`;
    channel.sendMessage({
      text: `I've started a video call. Join me : ${callUrl}`,})

      toast.success("Video Call link sent!");
  }
}

  const customMessageActions = {
    'Save to Flashcards': (message) => {
      setSelectedMessageText(message.text);
      setIsFlashcardModalOpen(true);
    },
    'Explain Message': (message) => {
      setSelectedMessageText(message.text);
      setActiveTab('suggestions');
    },
    'Translate': (message) => {
      setSelectedMessageText(message.text);
      setActiveTab('translation');
    }
  };

  if(loading || !chatClient || !channel) {
    return <ChatLoader /> }
  return (
    <div className="h-[93vh] flex">
      {/* Stream Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        <Chat client={chatClient}>
          <Channel channel={channel}>
            <div className='w-full relative h-full flex flex-col'>
              <div className="flex justify-between items-center absolute top-2 right-16 z-10 gap-2">
                <button 
                  className="btn btn-sm btn-primary shadow-lg"
                  onClick={() => setSidebarOpen(!isSidebarOpen)}
                >
                  <SparklesIcon className="size-4 mr-1" />
                  AI Copilot
                </button>
                <CallButton handleVideoCall={handleVideoCall}/>
              </div>
              <Window>
                <ChannelHeader />
                <MessageList 
                  customMessageActions={customMessageActions}
                />
                <MessageInput focus/>
              </Window>
            </div>
            <Thread />
          </Channel>
        </Chat>
      </div>

      {/* AI Sidebar Area */}
      <AISidebar selectedMessage={selectedMessageText} />
      
      <SaveFromChatModal 
        isOpen={isFlashcardModalOpen} 
        onClose={() => setIsFlashcardModalOpen(false)} 
        initialText={selectedMessageText}
      />
    </div>
  )
}
export default Chatpage;