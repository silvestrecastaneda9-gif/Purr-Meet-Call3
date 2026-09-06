cat << 'EOF' > ~/meow-meet/server.js
const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Explicitly serve static files from the absolute path of 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html directly
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);

    socket.on('offer', (data) => socket.to(data.target).emit('offer', { offer: data.offer, sender: socket.id }));
    socket.on('answer', (data) => socket.to(data.target).emit('answer', { answer: data.answer, sender: socket.id }));
    socket.on('ice-candidate', (data) => socket.to(data.target).emit('ice-candidate', { candidate: data.candidate, sender: socket.id }));

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', socket.id);
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🐾 MeowMeet running on port ${PORT}`));
EOF
