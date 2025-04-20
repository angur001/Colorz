import { ref, onUnmounted, type Ref } from 'vue';
import { Socket, io } from 'socket.io-client';

// Create a singleton socket instance
let socketInstance: Socket | null = null;
const isConnectedRef = ref<boolean>(false);
const lastMessageRef = ref<any>(null);

// Initialize the socket connection once
const initializeSocket = () => {
  if (!socketInstance) {
    socketInstance = io('http://localhost:3000');
    
    socketInstance.on('connect', () => {
      isConnectedRef.value = true;
      console.log('Connected to Socket.IO server');
    });
    
    socketInstance.on('disconnect', () => {
      isConnectedRef.value = false;
      console.log('Disconnected from Socket.IO server');
    });
    
    socketInstance.on('message', (data: any) => {
      lastMessageRef.value = data;
      console.log('Message received:', data);
    });
  }
  
  return socketInstance;
};

interface UseSocketReturn {
  socket: Ref<Socket | null>;
  isConnected: Ref<boolean>;
  lastMessage: Ref<any>;
  sendMessage: (message: any) => void;
  generateSessionKey: () => string;
}

export function useSocket(): UseSocketReturn {
  const socket = ref<Socket | null>(initializeSocket());
  
  // No need to connect on mount, as we're using a singleton

  onUnmounted(() => {
    // Don't disconnect on unmount, let the socket persist
    // We'll only clean up listeners specific to this component if needed
  });

  const sendMessage = (message: any): void => {
    if (socket.value && isConnectedRef.value) {
      socket.value.emit('message', message);
    } else if (socket.value) {
      // If not connected but socket exists, queue the message to be sent when connected
      socket.value.once('connect', () => {
        socket.value?.emit('message', message);
      });
    }
  };

  const generateSessionKey = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  return {
    socket,
    isConnected: isConnectedRef,
    lastMessage: lastMessageRef,
    sendMessage,
    generateSessionKey
  };
}