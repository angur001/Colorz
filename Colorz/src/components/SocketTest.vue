<template>
  <div class="socket-test">
    <h2>Socket.IO Test</h2>
    <div class="connection-status">
      Status: <span :class="{ connected: isConnected, disconnected: !isConnected }">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </span>
    </div>
    
    <div class="message-form">
      <input 
        v-model="message" 
        placeholder="Type a message" 
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage" :disabled="!isConnected">Send</button>
    </div>
    
    <div v-if="lastMessage" class="last-message">
      <h3>Last Message:</h3>
      <pre>{{ lastMessage }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSocket } from '../composables/useSocket';

const { isConnected, lastMessage, sendMessage: emitMessage } = useSocket();
const message = ref('');

const sendMessage = () => {
  if (message.value.trim()) {
    emitMessage(message.value);
    message.value = '';
  }
};
</script>

<style scoped>
.socket-test {
  margin: 20px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.connection-status {
  margin-bottom: 15px;
  font-weight: bold;
}

.connected {
  color: green;
}

.disconnected {
  color: red;
}

.message-form {
  display: flex;
  margin-bottom: 15px;
}

input {
  flex: 1;
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.last-message {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}
</style>