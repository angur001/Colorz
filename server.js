const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite's default development port
    methods: ["GET", "POST"]
  }
});

// Store active sessions
const sessions = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle regular messages
  socket.on('message', (data) => {
    console.log('Message received:', data);
    
    // Handle different message types
    if (data.type === 'create_session') {
      handleCreateSession(socket, data);
    } else if (data.type === 'join_session') {
      handleJoinSession(socket, data);
    } else if (data.type === 'start_game') {
      handleStartGame(socket, data);
    } else if (data.type === 'update_session_color') {
      handleUpdateSessionColor(socket, data);
    } else if (data.type === 'submit_guess') {
      handleSubmitGuess(socket, data);
    } else {
      // Broadcast regular messages to all clients
      io.emit('message', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    handlePlayerDisconnect(socket);
  });
});

// Create a new session
function handleCreateSession(socket, data) {
  const { sessionKey } = data;
  
  // Create a new session with the host
  sessions.set(sessionKey, {
    host: socket.id,
    players: [{
      id: socket.id,
      name: `Player ${socket.id.substr(0, 4)}`,
      isHost: true
    }],
    color: null
  });
  
  // Join the socket to the session room
  socket.join(sessionKey);
  
  console.log(`Session created: ${sessionKey} by ${socket.id}`);
  
  // Notify the client
  io.to(sessionKey).emit('player_joined', {
    sessionKey,
    players: sessions.get(sessionKey).players
  });
}

// Join an existing session
function handleJoinSession(socket, data) {
  const { sessionKey, isHost } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) {
    socket.emit('message', { 
      type: 'error', 
      message: 'Session not found' 
    });
    return;
  }
  
  const session = sessions.get(sessionKey);
  
  // Add player to session
  const playerExists = session.players.some(p => p.id === socket.id);
  
  if (!playerExists) {
    session.players.push({
      id: socket.id,
      name: `Player ${socket.id.substr(0, 4)}`,
      isHost: isHost
    });
  }
  
  // Join the socket to the session room
  socket.join(sessionKey);
  
  console.log(`Player ${socket.id} joined session: ${sessionKey}`);
  
  // Notify all clients in the session
  io.to(sessionKey).emit('player_joined', {
    sessionKey,
    players: session.players
  });
  
  // Send current color to the new player if it exists
  if (session.color) {
    socket.emit('session_color_update', {
      sessionKey,
      color: session.color
    });
  }
}

// Update the color for a session
function handleUpdateSessionColor(socket, data) {
  const { sessionKey, color } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  const session = sessions.get(sessionKey);
  
  // Check if the sender is the host
  const player = session.players.find(p => p.id === socket.id);
  if (!player || !player.isHost) return;
  
  // Update the session color
  session.color = color;
  
  // Broadcast to all clients in the session
  io.to(sessionKey).emit('session_color_update', {
    sessionKey,
    color
  });
}

// Handle player guess submission
function handleSubmitGuess(socket, data) {
  // You can implement leaderboard or scoring functionality here
  console.log(`Player ${socket.id} submitted a guess with score: ${data.score}`);
}

// Handle player disconnect
function handlePlayerDisconnect(socket) {
  // Remove player from any sessions they were in
  for (const [sessionKey, session] of sessions.entries()) {
    const playerIndex = session.players.findIndex(p => p.id === socket.id);
    
    if (playerIndex !== -1) {
      // Remove the player
      session.players.splice(playerIndex, 1);
      
      // If no players left, remove the session
      if (session.players.length === 0) {
        sessions.delete(sessionKey);
        console.log(`Session ${sessionKey} removed (no players left)`);
      } else {
        // If the host left, assign a new host
        if (session.host === socket.id && session.players.length > 0) {
          session.host = session.players[0].id;
          session.players[0].isHost = true;
        }
        
        // Notify remaining players
        io.to(sessionKey).emit('player_joined', {
          sessionKey,
          players: session.players
        });
      }
    }
  }
}

// Handle game start
function handleStartGame(socket, data) {
  const { sessionKey } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  const session = sessions.get(sessionKey);
  
  // Check if the sender is the host
  const player = session.players.find(p => p.id === socket.id);
  if (!player || !player.isHost) return;
  
  // Generate initial color for the game
  const initialColor = {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256)
  };
  
  session.color = initialColor;
  
  // Notify all clients that the game has started
  io.to(sessionKey).emit('game_started', {
    sessionKey,
    initialColor
  });
  
  console.log(`Game started for session ${sessionKey}`);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});