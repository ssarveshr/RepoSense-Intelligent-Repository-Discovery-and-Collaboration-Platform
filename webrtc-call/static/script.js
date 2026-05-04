const socket = io({
  extraHeaders: {
    "Bypass-Tunnel-Reminder": "true"
  }
});

let localStream;
let peers = {};
let room;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

// UI Elements
const joinScreen = document.getElementById("joinScreen");
const callScreen = document.getElementById("callScreen");
const videoGrid = document.getElementById("videoGrid");
const roomInput = document.getElementById("roomInput");
const chatSidebar = document.getElementById("chatSidebar");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

let isAudioMuted = false;
let isVideoMuted = false;

// Join Room Logic
async function joinRoom() {
  room = roomInput.value.trim();
  if (!room) return alert("Please enter a room code");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
  } catch (err) {
    console.error("Failed to get local stream", err);
    alert("Could not access camera/microphone");
    return;
  }

  // Switch screens
  joinScreen.classList.remove("active");
  callScreen.classList.add("active");

  addVideo("localVideo", localStream, true);

  socket.emit("join", { room });
}

// UI Controls
function toggleMic() {
  if (!localStream) return;
  isAudioMuted = !isAudioMuted;
  localStream.getAudioTracks()[0].enabled = !isAudioMuted;

  const micBtn = document.getElementById("micBtn");
  if (isAudioMuted) {
    micBtn.classList.add("off");
    micBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
  } else {
    micBtn.classList.remove("off");
    micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
  }
}

function toggleCam() {
  if (!localStream) return;
  isVideoMuted = !isVideoMuted;
  localStream.getVideoTracks()[0].enabled = !isVideoMuted;

  const camBtn = document.getElementById("camBtn");
  if (isVideoMuted) {
    camBtn.classList.add("off");
    camBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
  } else {
    camBtn.classList.remove("off");
    camBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
  }
}

function toggleChat() {
  chatSidebar.classList.toggle("active");
}

function leaveCall() {
  // Stop all tracks
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  // Close all peer connections
  Object.values(peers).forEach(pc => pc.close());
  peers = {};

  // Reset UI
  videoGrid.innerHTML = "";
  chatMessages.innerHTML = "";

  // Switch back to join screen
  callScreen.classList.remove("active");
  joinScreen.classList.add("active");

  // Disconnect and reconnect socket to fully clear state on server
  socket.disconnect();
  socket.connect();
}

// Chat Functionality
function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || !room) return;

  // Append my message`
  appendMessage("self", message);

  socket.emit("chat-message", { room, message });
  chatInput.value = "";
}

chatInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") sendMessage();
});

socket.on("chat-message", data => {
  appendMessage("other", data.message);
});

function appendMessage(type, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${type}`;
  msgDiv.innerText = text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// WebRTC Logic
function addVideo(id, stream, isLocal = false) {
  // Prevent duplicate videos
  if (document.getElementById(`container-${id}`)) return;

  const container = document.createElement("div");
  container.className = "video-container";
  container.id = `container-${id}`;

  const video = document.createElement("video");
  video.id = id;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = isLocal; // Mute our own video to prevent feedback
  video.onloadedmetadata = () => {
    video.play().catch(e => console.error("Play failed", e));
  };

  container.appendChild(video);
  videoGrid.appendChild(container);
}

function createPeer(userId) {
  const pc = new RTCPeerConnection(config);

  // Add our local tracks to the peer connection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  // When we receive remote tracks, add them to the UI
  pc.ontrack = e => {
    const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
    if (!document.getElementById(`container-${userId}`)) {
      addVideo(userId, stream);
    } else {
      const videoElem = document.getElementById(userId);
      if (videoElem) {
        videoElem.srcObject = stream;
      }
    }
  };

  // When we generate ICE candidates, send them to the peer
  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", {
        target: userId,
        candidate: e.candidate
      });
    }
  };

  peers[userId] = pc;
  return pc;
}

// 1. Existing users receive 'user-joined' when a new user enters
socket.on("user-joined", userId => {
  const pc = createPeer(userId);

  // Existing user initiates the offer
  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer);
    socket.emit("offer", {
      target: userId,
      offer
    });
  });
});

// 2. New user receives 'offer' from existing users
socket.on("offer", async data => {
  let pc = peers[data.sender];
  if (!pc) {
    pc = createPeer(data.sender);
  }

  await pc.setRemoteDescription(data.offer);

  // Process queued ICE candidates
  if (iceCandidateQueue[data.sender]) {
    for (const candidate of iceCandidateQueue[data.sender]) {
      try { await pc.addIceCandidate(candidate); } catch (e) { }
    }
    delete iceCandidateQueue[data.sender];
  }

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("answer", {
    target: data.sender,
    answer
  });
});

// 3. Existing users receive 'answer' from the new user
socket.on("answer", async data => {
  if (peers[data.sender]) {
    await peers[data.sender].setRemoteDescription(data.answer);

    // Process queued ICE candidates
    if (iceCandidateQueue[data.sender]) {
      for (const candidate of iceCandidateQueue[data.sender]) {
        try { await peers[data.sender].addIceCandidate(candidate); } catch (e) { }
      }
      delete iceCandidateQueue[data.sender];
    }
  }
});

let iceCandidateQueue = {};

// Exchange ICE candidates
socket.on("ice", async data => {
  const senderId = data.sender;
  if (!peers[senderId]) {
    // Peer connection not created yet, queue it
    if (!iceCandidateQueue[senderId]) iceCandidateQueue[senderId] = [];
    iceCandidateQueue[senderId].push(data.candidate);
    return;
  }

  const pc = peers[senderId];
  if (!pc.remoteDescription) {
    // Remote description not set yet, queue it
    if (!iceCandidateQueue[senderId]) iceCandidateQueue[senderId] = [];
    iceCandidateQueue[senderId].push(data.candidate);
  } else {
    try {
      await pc.addIceCandidate(data.candidate);
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  }
});

// When a user leaves, clean up their video and peer connection
socket.on("user-left", userId => {
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
  }

  const container = document.getElementById(`container-${userId}`);
  if (container) container.remove();
});