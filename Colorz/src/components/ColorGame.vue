<template>
  <div class="color-game">
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
        <button @click="newGame" :disabled="!showResult" class="new-game-btn">New Game</button>
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
import { useSocket } from '../composables/useSocket';

// Socket connection for multiplayer features (optional)
const { socket, sendMessage } = useSocket();

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
  
  // Optionally send the new color to the server
  if (socket.value) {
    sendMessage({
      type: 'new_game',
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

// Initialize the game on component mount
onMounted(() => {
  newGame();
});
</script>

<style scoped>
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