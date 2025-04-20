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
            <span v-if="player.id === socket?.id" class="you-badge">(You)</span>
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
const username = ref(route.query.username as string || localStorage.getItem('colorz-username') || 'Anonymous');
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

// Start the game (host only)
const startGame = () => {
  if (!isHost.value) return;
  
  sendMessage({
    type: 'start_game',
    sessionKey: sessionKey.value
  });
  
  // Navigate to game with username
  router.push(`/game/${sessionKey.value}?host=true&username=${encodeURIComponent(username.value)}`);
};

// Join the waiting room
onMounted(() => {
  if (sessionKey.value) {
    sendMessage({
      type: 'join_waiting_room',
      sessionKey: sessionKey.value,
      isHost: isHost.value,
      username: username.value
    });
  }
  
  // Listen for player updates
  socket.value?.on('player_joined', (data) => {
    if (data.sessionKey === sessionKey.value) {
      players.value = data.players;
    }
  });
  
  // Listen for game start
  socket.value?.on('game_started', (data) => {
    if (data.sessionKey === sessionKey.value) {
      router.push(`/game/${sessionKey.value}?host=${isHost.value}&username=${encodeURIComponent(username.value)}`);
    }
  });
});
</script>

<style scoped>
.waiting-room {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.room-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 30px;
  color: #333;
  position: relative;
}

.room-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 3px;
  background: linear-gradient(90deg, #4ecdc4, #45b7d8);
  border-radius: 2px;
}

.session-info {
  background-color: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.share-key {
  margin-bottom: 30px;
  text-align: center;
}

.share-key h3 {
  margin-top: 0;
  color: #333;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.key-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
}

.key {
  background-color: #f8f9fa;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  letter-spacing: 1px;
  border: 1px dashed #ccc;
}

.copy-btn {
  background-color: #45b7d8;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.copy-btn:hover {
  background-color: #3aa8c9;
}

.players-container {
  margin-bottom: 30px;
}

.players-container h3 {
  color: #333;
  font-size: 1.5rem;
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
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.you-badge {
  background-color: #ff6b6b;
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 8px;
}

.controls {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.start-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 30px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.start-btn:hover {
  background-color: #3d8b40;
}

.start-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.waiting-message {
  font-style: italic;
  color: #666;
  text-align: center;
  font-size: 1.1rem;
}
</style>