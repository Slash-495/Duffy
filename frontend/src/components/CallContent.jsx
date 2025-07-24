import { CallingState, StreamTheme, useCallStateHooks } from '@stream-io/video-react-sdk'
import { Speaker } from 'lucide-react';
import React from 'react'
import { useNavigate } from 'react-router';
import {
    CallControls,
    SpeakerLayout,
} from '@stream-io/video-react-sdk';

const CallContent = () => {
    const {useCallCallingState} = useCallStateHooks();
    const callingState = useCallCallingState();

    const navigate = useNavigate();
    if(callingState === CallingState.LEFT) {
        return navigate("/"); 
    }
  return (
    <StreamTheme>
        <SpeakerLayout />
        <CallControls />
    </StreamTheme>

  )
}

export default CallContent
