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
    sendMessage({
      type: 'start_game',
      sessionKey: sessionKey.value
    });
    
    router.push(`/game/${sessionKey.value}?host=true`);
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