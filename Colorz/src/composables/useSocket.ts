import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { Socket, io } from 'socket.io-client';

interface UseSocketReturn {
    isConnected: Ref<boolean>;
    lastMessage: Ref<any>;
    sendMessage: (message: any) => void;
}

export function useSocket(): UseSocketReturn {
  const socket = ref<Socket | null>(null);
  const isConnected = ref<boolean>(false);
  const lastMessage = ref<any>(null);

  onMounted(() => {
    socket.value = io('http://localhost:3000');
    
    socket.value.on('connect', () => {
      isConnected.value = true;
      console.log('Connected to Socket.IO server');
    });
    
    socket.value.on('disconnect', () => {
      isConnected.value = false;
      console.log('Disconnected from Socket.IO server');
    });
    
    socket.value.on('message', (data: any) => {
      lastMessage.value = data;
      console.log('Message received:', data);
    });
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
    }
  });

  const sendMessage = (message: any): void => {
    if (socket.value && isConnected.value) {
      socket.value.emit('message', message);
    }
  };

  return {
    isConnected: isConnected,
    lastMessage: lastMessage,
    sendMessage
  };
}