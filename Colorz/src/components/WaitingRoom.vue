<template>
  <div class="waiting-room">
    <h2 class="room-title">Game Session: {{ sessionKey }}</h2>
    
    <div class="session-info">
      <div class="share-key" v-if="isHost">
        <h3>Share this key with friends</h3>
        <div class="key-display">
          <span class="key">{{ sessionKey }}</span>
          <button @click="copySessionKey" class="copy-btn">
            <span v-if="copied">Copied!</span>
            <span v-else>Copy</span>
          </button>
        </div>
      </div>
      
      <!-- Game settings section (only for host) -->
      <div class="game-settings" v-if="isHost">
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
        <div class="setting-group">
          <label>Time Limit per Round:</label>
          <select v-model.number="timeLimit">
            <option value="0">No Limit</option>
            <option v-for="n in [5, 10, 15, 20, 30]" :key="n" :value="n">{{ n }} seconds</option>
          </select>
        </div>
      </div>
      
      <div class="players-container">
        <h3>Players in Session ({{ players.length }})</h3>
        <ul class="players-list">
          <li v-for="player in players" :key="player.id" class="player-item">
            <span class="player-name">{{ player.name }}</span>
            <span v-if="player.isHost" class="host-badge">Host</span>
          </li>
        </ul>
      </div>
      
      <div class="controls">
        <button 
          v-if="isHost" 
          @click="startGame" 
          class="start-btn"
          :disabled="players.length < 1"
        >
          Start Game
        </button>
        <p v-else class="waiting-message">Waiting for host to start the game...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSocket } from '../composables/useSocket';

const route = useRoute();
const router = useRouter();
const { socket, sendMessage } = useSocket();

const sessionKey = ref(route.params.id as string);
const isHost = ref(route.query.host === 'true');
const players = ref<Array<{id: string, name: string, isHost: boolean}>>([]);
const copied = ref(false);

// Game settings
const totalRounds = ref(3);
const hardMode = ref(false);
const timeLimit = ref(10);

// Copy session key to clipboard
const copySessionKey = () => {
  navigator.clipboard.writeText(sessionKey.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
};

// Start the game for all players
const startGame = () => {
  if (isHost.value) {
    // Send game settings to all players
    sendMessage({
      type: 'game_settings',
      sessionKey: sessionKey.value,
      totalRounds: totalRounds.value,
      hardMode: hardMode.value,
      timeLimit: timeLimit.value
    });
    
    // Start the game
    sendMessage({
      type: 'start_game',
      sessionKey: sessionKey.value,
      timeLimit: timeLimit.value
    });
    
    // Navigate to game page with settings as query parameters
    router.push(`/game/${sessionKey.value}?host=true&rounds=${totalRounds.value}&hardMode=${hardMode.value}`);
  }
};

onMounted(() => {
  if (socket.value) {
    // Listen for player joined events
    socket.value.on('player_joined', (data) => {
      if (data.sessionKey === sessionKey.value) {
        players.value = data.players;
      }
    });
    
    // Listen for game start event
    socket.value.on('game_started', (data) => {
      if (data.sessionKey === sessionKey.value && !isHost.value) {
        router.push(`/game/${sessionKey.value}`);
      }
    });
    
    // Listen for game settings
    socket.value.on('game_settings', (data) => {
      if (data.sessionKey === sessionKey.value && !isHost.value) {
        // Store settings in localStorage for non-host players
        localStorage.setItem('colorz-game-rounds', data.totalRounds);
        localStorage.setItem('colorz-game-hardmode', data.hardMode);
      }
    });
    
    // Join the session
    sendMessage({
      type: 'join_session',
      sessionKey: sessionKey.value,
      isHost: isHost.value
    });
  }
});
</script>

<style scoped>
.waiting-room {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.room-title {
  text-align: center;
  color: #333;
  font-size: 2rem;
  margin-bottom: 30px;
  position: relative;
}

.room-title::after {
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

.session-info {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.share-key {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.share-key h3 {
  margin-top: 0;
  color: #333;
}

.key-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
}

.key {
  font-size: 2rem;
  font-weight: bold;
  letter-spacing: 3px;
  color: #45b7d8;
  background-color: #f0f8ff;
  padding: 10px 20px;
  border-radius: 8px;
  border: 2px dashed #45b7d8;
}

.copy-btn {
  background-color: #45b7d8;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.copy-btn:hover {
  background-color: #3aa8c9;
}

/* Game settings styles */
.game-settings {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.game-settings h3 {
  margin-top: 0;
  color: #333;
  margin-bottom: 15px;
}

.setting-group {
  margin-bottom: 15px;
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

.switch .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  height: auto;
  margin: 0;
}

.switch .slider:before {
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

.players-container {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.players-container h3 {
  margin-top: 0;
  color: #333;
  margin-bottom: 15px;
}

.players-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background-color: #f8f9fa;
  margin-bottom: 10px;
  border-radius: 8px;
  transition: transform 0.2s;
}

.player-item:hover {
  transform: translateX(5px);
}

.player-name {
  font-weight: 500;
  color: #333;
}

.host-badge {
  background-color: #4ecdc4;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.controls {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.start-btn {
  background-color: #4ecdc4;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.start-btn:hover {
  background-color: #3dbeb6;
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.start-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.waiting-message {
  color: #666;
  font-style: italic;
}
</style>