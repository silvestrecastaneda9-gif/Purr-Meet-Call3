// 1. MUST BE AT THE VERY TOP
const socket = io();

let currentRoomCode = null;
let localStream = null;
const peerConnections = {};

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function createRoomCode() {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  startCall(code);
}

function joinWithCode() {
  const codeInput = document.getElementById('codeInput');
  if (!codeInput) return;
  const code = codeInput.value.trim();
  if (code.length < 4) {
    alert('Please enter a valid 4-digit code!');
    return;
  }
  startCall(code);
}

async function startCall(roomCode) {
  currentRoomCode = roomCode;

  const lobby = document.getElementById('lobby-screen');
  const callScreen = document.getElementById('call-screen');
  const displayCode = document.getElementById('displayCode');
  const localVideo = document.getElementById('localVideo');

  if (lobby) lobby.style.display = 'none';
  if (callScreen) callScreen.style.display = 'block';
  if (displayCode) displayCode.innerText = roomCode;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo) {
      localVideo.srcObject = localStream;
    }
  } catch (err) {
    console.error('Camera/Microphone access error:', err);
    alert('Unable to access camera or microphone. Please check permissions.');
  }

  socket.emit('join-room', roomCode);
}

socket.on('user-connected', async (userId) => {
  const pc = createPeerConnection(userId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('offer', { target: userId, offer });
});

socket.on('offer', async (data) => {
  const pc = createPeerConnection(data.sender);
  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', { target: data.sender, answer });
});

socket.on('answer', async (data) => {
  if (peerConnections[data.sender]) {
    await peerConnections[data.sender].setRemoteDescription(new RTCSessionDescription(data.answer));
  }
});

socket.on('ice-candidate', async (data) => {
  if (peerConnections[data.sender]) {
    await peerConnections[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

socket.on('user-disconnected', (userId) => {
  if (peerConnections[userId]) {
    peerConnections[userId].close();
    delete peerConnections[userId];
    const card = document.getElementById(`card-${userId}`);
    if (card) card.remove();
  }
});

function createPeerConnection(userId) {
  const pc = new RTCPeerConnection(config);
  peerConnections[userId] = pc;
  const videoGrid = document.getElementById('video-grid');

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit('ice-candidate', { target: userId, candidate: e.candidate });
  };

  pc.ontrack = (e) => {
    if (!document.getElementById(`card-${userId}`)) {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.id = `card-${userId}`;
      card.innerHTML = `<video id="video-${userId}" autoplay playsinline></video><div class="cat-ears"></div><span class="label">Cat Peer</span>`;
      if (videoGrid) videoGrid.appendChild(card);
      
      const remoteVideo = document.getElementById(`video-${userId}`);
      if (remoteVideo) remoteVideo.srcObject = e.streams[0];
    }
  };

  return pc;
}

function leaveRoom() { 
  window.location.reload(); 
}

function toggleAudio() {
  const audioTrack = localStream?.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    const btn = document.getElementById('micBtn');
    if (btn) {
      btn.textContent = audioTrack.enabled ? '🎤 Mute Mic' : '🎙️ Unmute Mic';
      btn.classList.toggle('off', !audioTrack.enabled);
    }
  }
}

function toggleVideo() {
  const videoTrack = localStream?.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    const btn = document.getElementById('camBtn');
    if (btn) {
      btn.textContent = videoTrack.enabled ? '📹 Camera Off' : '📷 Camera On';
      btn.classList.toggle('off', !videoTrack.enabled);
    }
  }
}

function playMeow() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}
