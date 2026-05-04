import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

export default function WebRTCRoom() {
  const [room, setRoom] = useState("");
  const [inCall, setInCall] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([]);
  
  const videoGridRef = useRef(null);
  
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const iceCandidateQueueRef = useRef({});
  
  const navigate = useNavigate();

  useEffect(() => {
    socketRef.current = io("http://localhost:5000", {
      extraHeaders: { "Bypass-Tunnel-Reminder": "true" }
    });

    socketRef.current.on("user-joined", userId => {
      const pc = createPeer(userId);
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socketRef.current.emit("offer", { target: userId, offer });
      });
    });

    socketRef.current.on("offer", async data => {
      let pc = peersRef.current[data.sender];
      if (!pc) {
        pc = createPeer(data.sender);
      }
      await pc.setRemoteDescription(data.offer);
      
      if (iceCandidateQueueRef.current[data.sender]) {
        for (const candidate of iceCandidateQueueRef.current[data.sender]) {
          try { await pc.addIceCandidate(candidate); } catch (e) {}
        }
        delete iceCandidateQueueRef.current[data.sender];
      }
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("answer", { target: data.sender, answer });
    });

    socketRef.current.on("answer", async data => {
      if (peersRef.current[data.sender]) {
        await peersRef.current[data.sender].setRemoteDescription(data.answer);
        if (iceCandidateQueueRef.current[data.sender]) {
          for (const candidate of iceCandidateQueueRef.current[data.sender]) {
            try { await peersRef.current[data.sender].addIceCandidate(candidate); } catch (e) {}
          }
          delete iceCandidateQueueRef.current[data.sender];
        }
      }
    });

    socketRef.current.on("ice", async data => {
      const senderId = data.sender;
      if (!peersRef.current[senderId]) {
        if (!iceCandidateQueueRef.current[senderId]) iceCandidateQueueRef.current[senderId] = [];
        iceCandidateQueueRef.current[senderId].push(data.candidate);
        return;
      }
      const pc = peersRef.current[senderId];
      if (!pc.remoteDescription) {
        if (!iceCandidateQueueRef.current[senderId]) iceCandidateQueueRef.current[senderId] = [];
        iceCandidateQueueRef.current[senderId].push(data.candidate);
      } else {
        try { await pc.addIceCandidate(data.candidate); } catch (e) {}
      }
    });

    socketRef.current.on("user-left", userId => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      const container = document.getElementById(`container-${userId}`);
      if (container) container.remove();
    });

    socketRef.current.on("chat-message", data => {
      setMessages(prev => [...prev, { type: "other", text: data.message }]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, []);

  const createPeer = (userId) => {
    const pc = new RTCPeerConnection(config);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    pc.ontrack = e => {
      const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
      if (!document.getElementById(`container-${userId}`)) {
        addVideo(userId, stream);
      } else {
        const videoElem = document.getElementById(userId);
        if (videoElem) videoElem.srcObject = stream;
      }
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        socketRef.current.emit("ice", { target: userId, candidate: e.candidate });
      }
    };

    peersRef.current[userId] = pc;
    return pc;
  };

  const addVideo = (id, stream, isLocal = false) => {
    if (!videoGridRef.current) return;
    if (document.getElementById(`container-${id}`)) return;

    const container = document.createElement("div");
    container.className = "relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg";
    container.id = `container-${id}`;

    const video = document.createElement("video");
    video.id = id;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = isLocal;
    video.className = "w-full h-full object-cover transform -scale-x-100";
    video.onloadedmetadata = () => video.play().catch(() => {});

    container.appendChild(video);
    videoGridRef.current.appendChild(container);
  };

  const joinRoom = async () => {
    if (!room.trim()) return alert("Please enter a room code");
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      return alert("Could not access camera/microphone");
    }

    setInCall(true);
    setTimeout(() => {
      addVideo("localVideo", localStreamRef.current, true);
      socketRef.current.emit("join", { room: room.trim() });
    }, 100);
  };

  const leaveCall = () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    if (videoGridRef.current) videoGridRef.current.innerHTML = "";
    
    setInCall(false);
    setMessages([]);
    socketRef.current.disconnect();
    socketRef.current.connect();
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isAudioMuted;
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const sendMessage = () => {
    if (!chatMessage.trim() || !room) return;
    setMessages(prev => [...prev, { type: "self", text: chatMessage }]);
    socketRef.current.emit("chat-message", { room, message: chatMessage });
    setChatMessage("");
  };

  if (!inCall) {
    return (
      <div className="flex justify-center items-center h-[70vh] animate-fade-in-up">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-2xl font-bold">Join Live Room</h2>
          </div>
          <p className="text-gray-500 mb-6">Enter a room code to start collaborating via video</p>
          <div className="space-y-4">
            <input 
              type="text" 
              value={room} 
              onChange={e => setRoom(e.target.value)} 
              placeholder="e.g. react-setup-help"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
            <button onClick={joinRoom} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors">
              Join Meeting
            </button>
            <button onClick={() => navigate(-1)} className="w-full py-3 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[80vh] flex overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl bg-gray-950 animate-fade-in-up">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isChatOpen ? 'mr-80' : ''}`}>
        <div ref={videoGridRef} className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto content-start items-center">
          {/* Videos appended here */}
        </div>
        
        {/* Controls */}
        <div className="h-24 bg-gradient-to-t from-gray-950 to-transparent flex justify-center items-center pb-4 absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <div className="flex gap-4 bg-gray-800/80 backdrop-blur-md px-6 py-3 rounded-full border border-gray-700 pointer-events-auto">
            <button onClick={toggleMic} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isAudioMuted ? 'bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isAudioMuted ? 
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /> :
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />}
              </svg>
            </button>
            <button onClick={toggleCam} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoMuted ? 'bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-gray-700 hover:bg-gray-600 text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button onClick={leaveCall} className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-red-600 hover:bg-red-700 text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white">In-call Messages</h3>
          <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`px-4 py-2 rounded-2xl max-w-[85%] ${msg.type === 'self' ? 'bg-blue-600 text-white self-end rounded-br-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white self-start rounded-bl-sm'}`}>
              <p className="text-sm">{msg.text}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
          <input 
            type="text" 
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Send a message..." 
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white"
          />
          <button onClick={sendMessage} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
