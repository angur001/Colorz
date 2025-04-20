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
          </li>
        </ul>
      </div>
    </div>
    
    <h2 class="game-title">Color Matching Challenge</h2>
    
    <div class="game-area">
      <div class="color-displays">
        <div class="target-color">
          <h3>Target Color</h3>
          <div class="color-box" :style="{ backgroundColor: targetColorRGB }"></div>
          <p v-if="showResult">{{ targetColorRGB }}</p>
        </div>
        
        <div class="user-color">
          <h3>Your Color</h3>
          <div class="color-box" :style="{ backgroundColor: userColorRGB }"></div>
          <p>{{ userColorRGB }}</p>
        </div>
      </div>
      
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
          @click="newGame" 
          :disabled="!showResult" 
          class="new-game-btn"
        >
          Start New Round
        </button>
        <p v-if="!isHost && showResult" class="waiting-message">
          Waiting for host to start a new round...
        </p>
      </div>
      
      <div v-if="showResult" class="result" :class="{ 'high-score': score >= 90, 'medium-score': score >= 70 && score < 90, 'low-score': score < 70 }">
        <h3>Result: {{ score }}%</h3>
        <p>{{ feedbackMessage }}</p>
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
  
  // Optionally send the result to the server
  if (socket.value) {
    sendMessage({
      type: 'submit_guess',
      sessionKey: sessionKey.value,
      userColor: {
        r: red.value,
        g: green.value,
        b: blue.value
      },
      score: score.value
    });
  }
};

// Start a new game
const newGame = () => {
  // Reset user's sliders to middle values
  red.value = 128;
  green.value = 128;
  blue.value = 128;
  
  // Generate a new target color
  generateRandomColor();
  
  // Reset game state
  showResult.value = false;
  score.value = 0;
  feedbackMessage.value = '';
};

// Listen for socket events related to sessions
onMounted(() => {
  // Set up session-related socket listeners
  if (socket.value) {
    // Player joined event
    socket.value.on('player_joined', (data) => {
      if (data.sessionKey === sessionKey.value) {
        players.value = data.players;
        
        // If host, send current color to new players
        if (isHost.value) {
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
    
    // Initial game data
    socket.value.on('game_started', (data) => {
      if (data.sessionKey === sessionKey.value) {
        targetRed.value = data.initialColor.r;
        targetGreen.value = data.initialColor.g;
        targetBlue.value = data.initialColor.b;
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
  
  // Initialize the game
  if (isHost.value) {
    // Host will generate a new color
    newGame();
  } else {
    // Non-host players will wait for color from server
    // Just reset the user's sliders
    red.value = 128;
    green.value = 128;
    blue.value = 128;
  }
});
</script>

<style scoped>
/* Add these new styles */
.session-info {
  background-color: white;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  border-left: 5px solid #45b7d8;
}

.session-info h3 {
  margin-top: 0;
  color: #333;
}

.players-list {
  margin-top: 10px;
}

.players-list h4 {
  margin-bottom: 5px;
  color: #555;
}

.players-list ul {
  list-style-type: none;
  padding-left: 0;
}

.players-list li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.color-game {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.game-title {
  text-align: center;
  color: #333;
  font-size: 2.2rem;
  margin-bottom: 30px;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
}

.game-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 4px;
  background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d8);
  border-radius: 2px;
}

.game-area {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.color-displays {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.target-color, .user-color {
  text-align: center;
  padding: 20px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
}

.target-color:hover, .user-color:hover {
  transform: translateY(-5px);
}

.target-color h3, .user-color h3 {
  margin-top: 0;
  color: #444;
  font-size: 1.4rem;
}

.color-box {
  width: 180px;
  height: 180px;
  border-radius: 12px;
  border: none;
  margin: 15px auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.color-box:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.sliders {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  background-color: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.slider-container {
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 15px;
  border-radius: 8px;
  border-left: 5px solid;
}

.red-container {
  border-left-color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.05);
}

.green-container {
  border-left-color: #4ecdc4;
  background-color: rgba(78, 205, 196, 0.05);
}

.blue-container {
  border-left-color: #45b7d8;
  background-color: rgba(69, 183, 216, 0.05);
}

.slider-container label {
  margin-bottom: 12px;
  font-weight: 600;
  color: #333;
  font-size: 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-preview {
  position: absolute;
  right: 15px;
  top: 15px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.slider-range {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  color: #777;
  font-size: 0.9rem;
}

input[type="range"] {
  width: 100%;
  height: 10px;
  margin-top: 8px;
  -webkit-appearance: none;
  background: #e9ecef;
  border-radius: 5px;
  outline: none;
  transition: background 0.3s;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.red-slider::-webkit-slider-thumb {
  background: linear-gradient(to bottom, #ff6b6b, #ee5253);
}

.green-slider::-webkit-slider-thumb {
  background: linear-gradient(to bottom, #4ecdc4, #26de81);
}

.blue-slider::-webkit-slider-thumb {
  background: linear-gradient(to bottom, #45b7d8, #3867d6);
}

.red-slider::-webkit-slider-runnable-track {
  background: linear-gradient(to right, #fff, #ff6b6b);
  height: 10px;
  border-radius: 5px;
}

.green-slider::-webkit-slider-runnable-track {
  background: linear-gradient(to right, #fff, #4ecdc4);
  height: 10px;
  border-radius: 5px;
}

.blue-slider::-webkit-slider-runnable-track {
  background: linear-gradient(to right, #fff, #45b7d8);
  height: 10px;
  border-radius: 5px;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}

button {
  padding: 12px 28px;
  font-size: 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.submit-btn {
  background-color: #4CAF50;
  color: white;
}

.submit-btn:hover {
  background-color: #3d8b40;
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.new-game-btn {
  background-color: #2196F3;
  color: white;
}

.new-game-btn:hover {
  background-color: #0b7dda;
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.waiting-message {
  color: #666;
  font-style: italic;
  text-align: center;
  margin: 10px 0;
  padding: 8px 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #45b7d8;
}

.result {
  text-align: center;
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.high-score {
  background-color: #d4edda;
  border-left: 5px solid #28a745;
}

.medium-score {
  background-color: #fff3cd;
  border-left: 5px solid #ffc107;
}

.low-score {
  background-color: #f8d7da;
  border-left: 5px solid #dc3545;
}

.result h3 {
  font-size: 1.5rem;
  margin-top: 0;
  color: #333;
}

.result p {
  font-size: 1.1rem;
  color: #555;
}

@media (max-width: 768px) {
  .color-displays {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  
  .color-box {
    width: 150px;
    height: 150px;
  }
}
</style>