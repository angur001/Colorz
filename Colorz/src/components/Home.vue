<template>
  <div class="home-container">
    <h1 class="app-title">Color Matching Game</h1>
    
    <!-- Username input field -->
    <div class="username-container">
      <label for="username">Your Username:</label>
      <input 
        id="username"
        v-model="username" 
        placeholder="Enter your username" 
        class="username-input"
      />
    </div>
    
    <div class="session-options">
      <div class="option-card create-session">
        <h2>Create New Session</h2>
        <p>Start a new game and invite friends to join</p>
        <button @click="createSession" class="create-btn" :disabled="!username.trim()">Create Session</button>
      </div>
      
      <div class="option-card join-session">
        <h2>Join Existing Session</h2>
        <p>Enter a session key to join a friend's game</p>
        <div class="join-form">
          <input 
            v-model="sessionKey" 
            placeholder="Enter session key" 
            @keyup.enter="joinSession"
            class="session-input"
          />
          <button @click="joinSession" :disabled="!sessionKey || !username.trim()" class="join-btn">Join</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '../composables/useSocket';

const router = useRouter();
const { socket, sendMessage, generateSessionKey } = useSocket();
const sessionKey = ref('');
const username = ref('');

// Load username from localStorage if available
onMounted(() => {
  const savedUsername = localStorage.getItem('colorz-username');
  if (savedUsername) {
    username.value = savedUsername;
  }
});

// Create a new session
const createSession = () => {
  if (!username.value.trim()) {
    alert('Please enter your username');
    return;
  }
  
  // Save username to localStorage
  localStorage.setItem('colorz-username', username.value);
  
  const newSessionKey = generateSessionKey();
  
  // Send session creation request to server with username
  sendMessage({
    type: 'create_session',
    sessionKey: newSessionKey,
    username: username.value
  });
  
  // Navigate to waiting room with session key and include username
  router.push(`/waiting/${newSessionKey}?host=true&username=${encodeURIComponent(username.value)}`);
};

// Join an existing session
const joinSession = () => {
  if (!sessionKey.value) return;
  
  if (!username.value.trim()) {
    alert('Please enter your username');
    return;
  }
  
  // Save username to localStorage
  localStorage.setItem('colorz-username', username.value);
  
  // Send join session request to server with username
  sendMessage({
    type: 'join_session',
    sessionKey: sessionKey.value,
    username: username.value
  });
  
  // Navigate to waiting room with session key and include username
  router.push(`/waiting/${sessionKey.value}?username=${encodeURIComponent(username.value)}`);
};
</script>

<style scoped>
.home-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}

.app-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 30px;
  color: #333;
  position: relative;
}

.app-title::after {
  content: '';
  position: absolute;
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 4px;
  background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d8);
  border-radius: 2px;
}

/* Username input styles */
.username-container {
  max-width: 400px;
  margin: 0 auto 40px;
  text-align: center;
  background-color: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.username-container label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
}

.username-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  text-align: center;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.username-input:focus {
  outline: none;
  border-color: #4ecdc4;
  box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.2);
}

.session-options {
  display: flex;
  gap: 30px;
  justify-content: center;
  flex-wrap: wrap;
}

.option-card {
  flex: 1;
  min-width: 300px;
  background-color: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.option-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.12);
}

.option-card h2 {
  margin-top: 0;
  color: #333;
  font-size: 1.8rem;
}

.option-card p {
  color: #666;
  margin-bottom: 25px;
  line-height: 1.5;
}

.create-session {
  border-top: 5px solid #4ecdc4;
}

.join-session {
  border-top: 5px solid #45b7d8;
}

.join-form {
  display: flex;
  gap: 10px;
}

.session-input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.session-input:focus {
  outline: none;
  border-color: #45b7d8;
  box-shadow: 0 0 0 3px rgba(69, 183, 216, 0.2);
}

button {
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.create-btn {
  background-color: #4ecdc4;
  color: white;
  width: 100%;
}

.create-btn:hover {
  background-color: #3dbeb6;
}

.join-btn {
  background-color: #45b7d8;
  color: white;
  white-space: nowrap;
}

.join-btn:hover {
  background-color: #3aa8c9;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .session-options {
    flex-direction: column;
  }
  
  .join-form {
    flex-direction: column;
  }
  
  .join-btn {
    width: 100%;
    margin-top: 10px;
  }
}
</style>