<template>
  <div class="color-game">
    <div class="session-info" v-if="sessionKey">
      <h3>Session: {{ sessionKey }}</h3>
      <p v-if="isHost">Share this key with friends to join your game</p>
      <div class="players-list" v-if="players.length > 0">
        <h4>Players:</h4>
        <ul>
          <li v-for="player in players" :key="player.id">
            {{ player.name }} {{ player.isHost ? '(Host)' : '' }}
            <span v-if="playerScores[player.id]" class="player-score">Score: {{ playerScores[player.id] }}</span>
          </li>
        </ul>
      </div>
      <div class="game-status">
        <p>Round: {{ currentRound }} / {{ totalRounds }}</p>
        <p>Mode: {{ hardMode ? 'Hard' : 'Easy' }}</p>
      </div>
    </div>
    
    <h2 class="game-title">Color Matching Challenge</h2>
    
    <!-- Game setup panel for host (only shown before first round) -->
    <div v-if="isHost && currentRound === 0" class="game-setup">
      <h3>Game Settings</h3>
      <div class="setting-group">
        <label>Number of Rounds:</label>
        <select v-model.number="totalRounds">
          <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div class="setting-group">
        <label>Difficulty:</label>
        <div class="toggle-container">
          <span>Easy</span>
          <label class="switch">
            <input type="checkbox" v-model="hardMode">
            <span class="slider round"></span>
          </label>
          <span>Hard</span>
        </div>
      </div>
      <button @click="startGame" class="start-game-btn">Start Game</button>
    </div>
    
    <!-- Waiting message for non-host players before game starts -->
    <div v-if="!isHost && currentRound === 0" class="waiting-setup">
      <p>Waiting for host to set up the game...</p>
    </div>
    
    <!-- Game area (only shown during active rounds) -->
    <div class="game-area" v-if="currentRound > 0 && !showLeaderboard">
      <div class="color-displays">
        <div class="target-color">
          <h3>Target Color</h3>
          <div class="color-box" :style="{ backgroundColor: targetColorRGB }"></div>
          <p v-if="showResult">{{ targetColorRGB }}</p>
        </div>
        
        <div class="user-color">
          <h3>Your Color</h3>
          <div class="color-box" :style="{ backgroundColor: hardMode && !showResult ? 'gray' : userColorRGB }"></div>
          <p v-if="!hardMode || showResult">{{ userColorRGB }}</p>
          <p v-else>Hidden until submission</p>
        </div>
      </div>
      
      <!-- Rest of the game UI remains the same -->
      <div class="sliders">
        <div class="slider-container red-container">
          <label>Red: {{ red }}</label>
          <div class="slider-preview" style="background-color: rgb(255, 0, 0, 0.7)"></div>
          <input type="range" min="0" max="255" v-model.number="red" class="red-slider slider" />
          <div class="slider-range">
            <span>0</span>
            <span>255</span>
          </div>
        </div>
        
        <div class="slider-container green-container">
          <label>Green: {{ green }}</label>
          <div class="slider-preview" style="background-color: rgb(0, 255, 0, 0.7)"></div>
          <input type="range" min="0" max="255" v-model.number="green" class="green-slider slider" />
          <div class="slider-range">
            <span>0</span>
            <span>255</span>
          </div>
        </div>
        
        <div class="slider-container blue-container">
          <label>Blue: {{ blue }}</label>
          <div class="slider-preview" style="background-color: rgb(0, 0, 255, 0.7)"></div>
          <input type="range" min="0" max="255" v-model.number="blue" class="blue-slider slider" />
          <div class="slider-range">
            <span>0</span>
            <span>255</span>
          </div>
        </div>
      </div>
      
      <div class="controls">
        <button @click="submitGuess" :disabled="showResult" class="submit-btn">Submit</button>
        <button 
          v-if="isHost" 
          @click="nextRound" 
          :disabled="!showResult" 
          class="new-game-btn"
        >
          {{ currentRound < totalRounds ? 'Next Round' : 'Show Results' }}
        </button>
        <p v-if="!isHost && showResult" class="waiting-message">
          Waiting for host to start next round...
        </p>
      </div>
      
      <div v-if="showResult" class="result" :class="{ 'high-score': score >= 90, 'medium-score': score >= 70 && score < 90, 'low-score': score < 70 }">
        <h3>Result: {{ score }}%</h3>
        <p>{{ feedbackMessage }}</p>
      </div>
    </div>
    
    <!-- Leaderboard (shown after all rounds) -->
    <div v-if="showLeaderboard" class="leaderboard">
      <h3>Final Results</h3>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(player, index) in sortedPlayers" :key="player.id" :class="{ 'current-player': player.id === socket?.id }">
            <td>{{ index + 1 }}</td>
            <td>{{ player.name }} {{ player.isHost ? '(Host)' : '' }}</td>
            <td>{{ player.score }}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="leaderboard-controls">
        <button v-if="isHost" @click="resetGame" class="reset-game-btn">Start New Game</button>
        <p v-else class="waiting-message">Waiting for host to start a new game...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSocket } from '../composables/useSocket';

const route = useRoute();
const { socket, sendMessage } = useSocket();

// Session information
const sessionKey = ref(route.params.id as string || '');
const isHost = ref(route.query.host === 'true');
const players = ref<Array<{id: string, name: string, isHost: boolean}>>([]);

// Game settings
const totalRounds = ref(3);
const currentRound = ref(0);
const hardMode = ref(false);
const showLeaderboard = ref(false);
const playerScores = ref<Record<string, number>>({});

// User's color values
const red = ref(128);
const green = ref(128);
const blue = ref(128);

// Target color values
const targetRed = ref(0);
const targetGreen = ref(0);
const targetBlue = ref(0);

// Game state
const showResult = ref(false);
const score = ref(0);
const feedbackMessage = ref('');

// Computed RGB strings
const userColorRGB = computed(() => {
  return `rgb(${red.value}, ${green.value}, ${blue.value})`;
});

const targetColorRGB = computed(() => {
  return `rgb(${targetRed.value}, ${targetGreen.value}, ${targetBlue.value})`;
});

// Computed sorted players for leaderboard
const sortedPlayers = computed(() => {
  return [...players.value].map(player => ({
    ...player,
    score: playerScores.value[player.id] || 0
  })).sort((a, b) => b.score - a.score);
});

// Start the game with current settings
const startGame = () => {
  if (!isHost.value) return;
  
  // Send game settings to all players
  sendMessage({
    type: 'game_settings',
    sessionKey: sessionKey.value,
    totalRounds: totalRounds.value,
    hardMode: hardMode.value
  });
  
  // Start the game
  sendMessage({
    type: 'start_game',
    sessionKey: sessionKey.value
  });
  
  // Update local state
  currentRound.value = 1;
};

// Generate a random color
const generateRandomColor = () => {
  targetRed.value = Math.floor(Math.random() * 256);
  targetGreen.value = Math.floor(Math.random() * 256);
  targetBlue.value = Math.floor(Math.random() * 256);
  
  // Send the new color to the server for the session
  if (socket.value && sessionKey.value && isHost.value) {
    sendMessage({
      type: 'update_session_color',
      sessionKey: sessionKey.value,
      color: {
        r: targetRed.value,
        g: targetGreen.value,
        b: targetBlue.value
      }
    });
  }
};

// Calculate the difference between two colors (0-100%)
const calculateColorDifference = () => {
  const redDiff = Math.abs(red.value - targetRed.value);
  const greenDiff = Math.abs(green.value - targetGreen.value);
  const blueDiff = Math.abs(blue.value - targetBlue.value);
  
  // Calculate the maximum possible difference (255 * 3)
  const maxDiff = 255 * 3;
  
  // Calculate the actual difference
  const actualDiff = redDiff + greenDiff + blueDiff;
  
  // Calculate the score (100% - percentage difference)
  return Math.round(100 - (actualDiff / maxDiff * 100));
};

// Generate feedback message based on score
const generateFeedback = (scoreValue: number) => {
  if (scoreValue >= 95) return "Perfect! You have an amazing eye for color!";
  if (scoreValue >= 90) return "Excellent! You're very close!";
  if (scoreValue >= 80) return "Great job! You have a good eye for color.";
  if (scoreValue >= 70) return "Good effort! Keep practicing.";
  if (scoreValue >= 60) return "Not bad, but there's room for improvement.";
  if (scoreValue >= 50) return "You're getting there. Keep trying!";
  return "Keep practicing to improve your color matching skills!";
};

// Submit the user's guess
const submitGuess = () => {
  score.value = calculateColorDifference();
  feedbackMessage.value = generateFeedback(score.value);
  showResult.value = true;
  
  // Update player's score
  if (socket.value?.id) {
    const currentScore = playerScores.value[socket.value.id] || 0;
    playerScores.value[socket.value.id] = currentScore + score.value;
  }
  
  // Send the result to the server
  if (socket.value) {
    sendMessage({
      type: 'submit_guess',
      sessionKey: sessionKey.value,
      playerId: socket.value.id,
      userColor: {
        r: red.value,
        g: green.value,
        b: blue.value
      },
      score: score.value,
      totalScore: playerScores.value[socket.value.id || ''] || 0
    });
  }
};

// Move to next round or show leaderboard
const nextRound = () => {
  if (!isHost.value) return;
  
  // Reset user's sliders to middle values
  red.value = 128;
  green.value = 128;
  blue.value = 128;
  
  // Check if we've completed all rounds
  if (currentRound.value >= totalRounds.value) {
    // Show leaderboard
    showLeaderboard.value = true;
    
    // Notify all players
    sendMessage({
      type: 'show_leaderboard',
      sessionKey: sessionKey.value,
      playerScores: playerScores.value
    });
    
    return;
  }
  
  // Generate a new target color
  generateRandomColor();
  
  // Reset game state
  showResult.value = false;
  score.value = 0;
  feedbackMessage.value = '';
  
  // Increment round counter
  currentRound.value++;
  
  // Notify all players about the new round
  sendMessage({
    type: 'new_round',
    sessionKey: sessionKey.value,
    currentRound: currentRound.value
  });
};

// Reset the game for a new session
const resetGame = () => {
  if (!isHost.value) return;
  
  // Reset game state
  currentRound.value = 0;
  showLeaderboard.value = false;
  playerScores.value = {};
  
  // Notify all players
  sendMessage({
    type: 'reset_game',
    sessionKey: sessionKey.value
  });
};

// Listen for socket events related to sessions
onMounted(() => {
  // Set up session-related socket listeners
  if (socket.value) {
    // Player joined event
    socket.value.on('player_joined', (data) => {
      if (data.sessionKey === sessionKey.value) {
        players.value = data.players;
        
        // If host, send current game state to new players
        if (isHost.value && currentRound.value > 0) {
          sendMessage({
            type: 'game_settings',
            sessionKey: sessionKey.value,
            totalRounds: totalRounds.value,
            hardMode: hardMode.value,
            currentRound: currentRound.value
          });
          
          sendMessage({
            type: 'update_session_color',
            sessionKey: sessionKey.value,
            color: {
              r: targetRed.value,
              g: targetGreen.value,
              b: targetBlue.value
            }
          });
          
          // Send current scores
          sendMessage({
            type: 'update_scores',
            sessionKey: sessionKey.value,
            playerScores: playerScores.value
          });
        }
      }
    });
    
    // Game settings update
    socket.value.on('game_settings', (data) => {
      if (data.sessionKey === sessionKey.value && !isHost.value) {
        totalRounds.value = data.totalRounds;
        hardMode.value = data.hardMode;
        
        if (data.currentRound) {
          currentRound.value = data.currentRound;
        } else {
          currentRound.value = 1; // Start first round for non-host players
        }
      }
    });
    
    // Session color update (for non-host players)
    socket.value.on('session_color_update', (data) => {
      if (data.sessionKey === sessionKey.value && !isHost.value) {
        targetRed.value = data.color.r;
        targetGreen.value = data.color.g;
        targetBlue.value = data.color.b;
        
        // Reset game state for non-host players when host starts a new round
        showResult.value = false;
        score.value = 0;
        feedbackMessage.value = '';
        
        // Reset sliders to middle values
        red.value = 128;
        green.value = 128;
        blue.value = 128;
      }
    });
    
    // New round notification
    socket.value.on('new_round', (data) => {
      if (data.sessionKey === sessionKey.value && !isHost.value) {
        currentRound.value = data.currentRound;
      }
    });
    
    // Score updates
    socket.value.on('update_scores', (data) => {
      if (data.sessionKey === sessionKey.value) {
        playerScores.value = data.playerScores;
      }
    });
    
    // Show leaderboard
    socket.value.on('show_leaderboard', (data) => {
      if (data.sessionKey === sessionKey.value && !isHost.value) {
        playerScores.value = data.playerScores;
        showLeaderboard.value = true;
      }
    });
    
    // Reset game
    socket.value.on('reset_game', (data) => {
      if (data.sessionKey === sessionKey.value && !isHost.value) {
        currentRound.value = 0;
        showLeaderboard.value = false;
        playerScores.value = {};
      }
    });
    
    // Initial game data
    socket.value.on('game_started', (data) => {
      if (data.sessionKey === sessionKey.value) {
        targetRed.value = data.initialColor.r;
        targetGreen.value = data.initialColor.g;
        targetBlue.value = data.initialColor.b;
        
        // Update round information
        currentRound.value = data.currentRound || 1;
        
        // Reset game state
        showResult.value = false;
        score.value = 0;
        feedbackMessage.value = '';
        
        // Reset sliders to middle values
        red.value = 128;
        green.value = 128;
        blue.value = 128;
      }
    });
    
    // Join the session
    if (sessionKey.value) {
      sendMessage({
        type: 'join_session',
        sessionKey: sessionKey.value,
        isHost: isHost.value
      });
    }
  }
});
</script>

<style scoped>
/* Add these new styles for the new components */
.game-status {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.game-setup {
  background-color: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
}

.game-setup h3 {
  margin-top: 0;
  color: #333;
  margin-bottom: 20px;
}

.setting-group {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-group label {
  font-weight: 600;
  color: #555;
}

.setting-group select {
  padding: 8px 15px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background-color: white;
  font-size: 1rem;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Toggle switch */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: relative; /* Change from absolute to relative */
  width: 100%;
  margin: 10px 0;
  -webkit-appearance: none;
  appearance: none;
  height: 10px;
  border-radius: 5px;
  background: #d3d3d3;
  outline: none;
}

/* Make sure the toggle switch slider still uses absolute positioning */
.switch .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.start-game-btn {
  background-color: #4CAF50;
  color: white;
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

.start-game-btn:hover {
  background-color: #3d8b40;
}

.waiting-setup {
  background-color: #f8f9fa;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  border-left: 5px solid #45b7d8;
  margin-bottom: 30px;
}

.waiting-setup p {
  font-size: 1.2rem;
  color: #666;
}

.leaderboard {
  background-color: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.leaderboard h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  font-size: 1.8rem;
}

.leaderboard table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.leaderboard th, .leaderboard td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.leaderboard th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.leaderboard tr.current-player {
  background-color: #e6f7ff;
}

.leaderboard-controls {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.reset-game-btn {
  background-color: #4CAF50;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

.reset-game-btn:hover {
  background-color: #3d8b40;
}

.player-score {
  float: right;
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  color: #555;
}

/* Add these missing styles for the game area */
.color-game {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.game-title {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.session-info {
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.players-list {
  margin-top: 15px;
}

.players-list ul {
  list-style-type: none;
  padding: 0;
}

.players-list li {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.game-area {
  background-color: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.color-displays {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.target-color, .user-color {
  flex: 1;
  text-align: center;
  padding: 0 15px;
}

.color-box {
  height: 120px;
  border-radius: 8px;
  margin: 10px 0;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.sliders {
  margin-bottom: 30px;
}

.slider-container {
  margin-bottom: 15px;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.slider-container label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
}

.slider-preview {
  height: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
}

.slider {
  width: 100%;
  margin: 10px 0;
  -webkit-appearance: none;
  height: 10px;
  border-radius: 5px;
  background: #d3d3d3;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
}

.red-slider::-webkit-slider-thumb {
  background: #ff5252;
}

.green-slider::-webkit-slider-thumb {
  background: #4CAF50;
}

.blue-slider::-webkit-slider-thumb {
  background: #2196F3;
}

.red-slider::-moz-range-thumb {
  background: #ff5252;
}

.green-slider::-moz-range-thumb {
  background: #4CAF50;
}

.blue-slider::-moz-range-thumb {
  background: #2196F3;
}

.slider-range {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  align-items: center;
}

.submit-btn, .new-game-btn {
  padding: 12px 25px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn {
  background-color: #2196F3;
  color: white;
}

.submit-btn:hover {
  background-color: #0b7dda;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.new-game-btn {
  background-color: #ff9800;
  color: white;
}

.new-game-btn:hover {
  background-color: #e68a00;
}

.new-game-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.waiting-message {
  font-style: italic;
  color: #666;
}

.result {
  text-align: center;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.high-score {
  background-color: #e8f5e9;
  border-left: 5px solid #4CAF50;
}

.medium-score {
  background-color: #fff8e1;
  border-left: 5px solid #ffc107;
}

.low-score {
  background-color: #ffebee;
  border-left: 5px solid #f44336;
}
</style>