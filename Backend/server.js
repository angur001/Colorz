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
    } else if (data.type === 'game_settings') {
      handleGameSettings(socket, data);
    } else if (data.type === 'update_session_color') {
      handleUpdateSessionColor(socket, data);
    } else if (data.type === 'submit_guess') {
      handleSubmitGuess(socket, data);
    } else if (data.type === 'new_round') {
      handleNewRound(socket, data);
    } else if (data.type === 'show_leaderboard') {
      handleShowLeaderboard(socket, data);
    } else if (data.type === 'reset_game') {
      handleResetGame(socket, data);
    } else if (data.type === 'update_scores') {
      handleUpdateScores(socket, data);
    } else if (data.type === 'start_game') {
      handleStartGame(socket, data);
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

// Handle game settings update
function handleGameSettings(socket, data) {
  const { sessionKey, totalRounds, hardMode, currentRound } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  // Update session settings
  const session = sessions.get(sessionKey);
  session.totalRounds = totalRounds;
  session.hardMode = hardMode;
  if (currentRound) {
    session.currentRound = currentRound;
  }
  
  // Broadcast to all clients in the session
  io.to(sessionKey).emit('game_settings', data);
}

// Handle new round
function handleNewRound(socket, data) {
  const { sessionKey, currentRound } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  const session = sessions.get(sessionKey);
  
  // Check if the sender is the host
  const player = session.players.find(p => p.id === socket.id);
  if (!player || !player.isHost) return;
  
  // Update session round
  session.currentRound = currentRound;
  
  // Broadcast to all clients in the session
  io.to(sessionKey).emit('new_round', data);
}

// Handle show leaderboard
function handleShowLeaderboard(socket, data) {
  const { sessionKey, playerScores } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  const session = sessions.get(sessionKey);
  
  // Check if the sender is the host
  const player = session.players.find(p => p.id === socket.id);
  if (!player || !player.isHost) return;
  
  // Update session scores
  session.playerScores = playerScores;
  
  // Broadcast to all clients in the session
  io.to(sessionKey).emit('show_leaderboard', data);
}

// Handle reset game
function handleResetGame(socket, data) {
  const { sessionKey } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  const session = sessions.get(sessionKey);
  
  // Check if the sender is the host
  const player = session.players.find(p => p.id === socket.id);
  if (!player || !player.isHost) return;
  
  // Reset session game state
  session.currentRound = 0;
  session.playerScores = {};
  
  // Broadcast to all clients in the session
  io.to(sessionKey).emit('reset_game', data);
}

// Handle update scores
function handleUpdateScores(socket, data) {
  const { sessionKey, playerScores } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  const session = sessions.get(sessionKey);
  
  // Check if the sender is the host
  const player = session.players.find(p => p.id === socket.id);
  if (!player || !player.isHost) return;
  
  // Update session scores
  session.playerScores = playerScores;
  
  // Broadcast to all clients in the session
  io.to(sessionKey).emit('update_scores', data);
}

// Update the submit guess handler to track scores
function handleSubmitGuess(socket, data) {
  const { sessionKey, playerId, score, totalScore } = data;
  
  // Check if session exists
  if (!sessions.has(sessionKey)) return;
  
  const session = sessions.get(sessionKey);
  
  // Update player score in session if needed
  if (!session.playerScores) {
    session.playerScores = {};
  }
  
  session.playerScores[playerId] = totalScore;
  
  // Broadcast score update to all clients
  io.to(sessionKey).emit('update_scores', {
    sessionKey,
    playerScores: session.playerScores
  });
  
  console.log(`Player ${socket.id} submitted a guess with score: ${score}, total: ${totalScore}`);
}

// Create a new session
function handleCreateSession(socket, data) {
  const { sessionKey, username } = data;
  
  // Create a new session with the host
  sessions.set(sessionKey, {
    host: socket.id,
    players: [{
      id: socket.id,
      name: username || `Player ${socket.id.substr(0, 4)}`,
      isHost: true
    }],
    color: null,
    currentRound: 0,
    playerScores: {}
  });
  
  // Join the socket to the session room
  socket.join(sessionKey);
  
  console.log(`Session created: ${sessionKey} by ${socket.id} (${username})`);
  
  // Notify the client
  io.to(sessionKey).emit('player_joined', {
    sessionKey,
    players: sessions.get(sessionKey).players
  });
}

// Join an existing session
function handleJoinSession(socket, data) {
  const { sessionKey, isHost, username } = data;
  
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
      name: username || `Player ${socket.id.substr(0, 4)}`,
      isHost: isHost
    });
  } else {
    // Update existing player's username if needed
    const playerIndex = session.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1 && username) {
      session.players[playerIndex].name = username;
    }
  }
  
  // Join the socket to the session room
  socket.join(sessionKey);
  
  console.log(`Player ${socket.id} (${username}) joined session: ${sessionKey}`);
  
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
  
  // Send current game state if game is in progress
  if (session.currentRound > 0) {
    socket.emit('game_settings', {
      sessionKey,
      totalRounds: session.totalRounds || 3,
      hardMode: session.hardMode || false,
      currentRound: session.currentRound
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
  session.currentRound = 1;
  
  // Notify all clients that the game has started
  io.to(sessionKey).emit('game_started', {
    sessionKey,
    initialColor,
    currentRound: 1
  });
  
  console.log(`Game started for session ${sessionKey}`);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});